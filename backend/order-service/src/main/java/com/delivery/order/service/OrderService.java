package com.delivery.order.service;

import com.delivery.order.dto.CreateOrderRequest;
import com.delivery.order.model.Order;
import com.delivery.order.model.OrderItem;
import com.delivery.order.model.OrderStatus;
import com.delivery.order.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;

    @Transactional
    public Order createOrder(CreateOrderRequest request) {
        BigDecimal subtotal = BigDecimal.ZERO;
        List<OrderItem> items = new ArrayList<>();

        BigDecimal deliveryFee = request.getDeliveryFee() != null 
                ? request.getDeliveryFee() 
                : new BigDecimal("7.00");

        Order order = Order.builder()
                .tenantId(request.getTenantId())
                .customerId(request.getCustomerId())
                .customerName(request.getCustomerName())
                .customerPhone(request.getCustomerPhone())
                .deliveryAddress(request.getDeliveryAddress())
                .paymentMethod(request.getPaymentMethod().toUpperCase())
                .notes(request.getNotes())
                .deliveryFee(deliveryFee)
                .status(OrderStatus.PAID) // Simulating automatic payment confirmation
                .build();

        for (CreateOrderRequest.CreateOrderItemDto itemDto : request.getItems()) {
            BigDecimal lineTotal = itemDto.getUnitPrice().multiply(BigDecimal.valueOf(itemDto.getQuantity()));
            subtotal = subtotal.add(lineTotal);

            OrderItem item = OrderItem.builder()
                    .order(order)
                    .dishId(itemDto.getDishId())
                    .dishName(itemDto.getDishName())
                    .quantity(itemDto.getQuantity())
                    .unitPrice(itemDto.getUnitPrice())
                    .totalPrice(lineTotal)
                    .optionsJson(itemDto.getOptionsJson())
                    .build();
            items.add(item);
        }

        order.setSubtotal(subtotal);
        order.setTotalAmount(subtotal.add(deliveryFee));
        order.setItems(items);

        return orderRepository.save(order);
    }

    public Order getOrderById(UUID id) {
        return orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Pedido não encontrado com ID: " + id));
    }

    public List<Order> getOrdersByTenant(UUID tenantId) {
        return orderRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);
    }

    public List<Order> getOrdersByCourier(UUID courierId) {
        return orderRepository.findByCourierIdOrderByCreatedAtDesc(courierId);
    }

    public List<Order> getAvailableDeliveries() {
        return orderRepository.findByStatusAndCourierIdIsNullOrderByCreatedAtDesc(OrderStatus.READY);
    }

    public List<Order> getAllOrders() {
        return orderRepository.findAllByOrderByCreatedAtDesc();
    }

    @Transactional
    public Order updateStatus(UUID id, OrderStatus newStatus, UUID courierId) {
        Order order = getOrderById(id);
        order.setStatus(newStatus);
        order.setUpdatedAt(LocalDateTime.now());
        if (courierId != null) {
            order.setCourierId(courierId);
        }
        return orderRepository.save(order);
    }
}
