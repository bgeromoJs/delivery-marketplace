package com.delivery.order.config;

import com.delivery.order.model.Order;
import com.delivery.order.model.OrderItem;
import com.delivery.order.model.OrderStatus;
import com.delivery.order.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final OrderRepository orderRepository;

    @Override
    public void run(String... args) {
        if (orderRepository.count() == 0) {
            log.info("Populando pedidos padrão de teste...");

            UUID pizzariaId = UUID.fromString("11111111-1111-1111-1111-111111111111");
            UUID dishId1 = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
            UUID dishId2 = UUID.fromString("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");

            // Pedido 1: Em Preparo na cozinha da Pizzaria
            Order order1 = Order.builder()
                    .tenantId(pizzariaId)
                    .customerName("Ana Clara Mendes")
                    .customerPhone("(11) 98888-1111")
                    .deliveryAddress("Rua Augusta, 1420 - Apto 52")
                    .paymentMethod("PIX")
                    .deliveryFee(new BigDecimal("6.90"))
                    .subtotal(new BigDecimal("54.90"))
                    .totalAmount(new BigDecimal("61.80"))
                    .status(OrderStatus.PREPARING)
                    .notes("Sem cebola por favor")
                    .build();

            OrderItem item1 = OrderItem.builder()
                    .order(order1)
                    .dishId(dishId1)
                    .dishName("Pizza Calabresa Especial")
                    .quantity(1)
                    .unitPrice(new BigDecimal("54.90"))
                    .totalPrice(new BigDecimal("54.90"))
                    .build();
            order1.setItems(List.of(item1));
            orderRepository.save(order1);

            // Pedido 2: Pronto na Pizzaria aguardando entregador aceitar
            Order order2 = Order.builder()
                    .tenantId(pizzariaId)
                    .customerName("Lucas Ferreira")
                    .customerPhone("(11) 97777-2222")
                    .deliveryAddress("Alameda Santos, 800 - Jardins")
                    .paymentMethod("CREDIT_CARD")
                    .deliveryFee(new BigDecimal("6.90"))
                    .subtotal(new BigDecimal("72.00"))
                    .totalAmount(new BigDecimal("78.90"))
                    .status(OrderStatus.READY)
                    .build();

            OrderItem item2 = OrderItem.builder()
                    .order(order2)
                    .dishId(dishId2)
                    .dishName("Pizza Margherita Gourmet + Coca 2L")
                    .quantity(1)
                    .unitPrice(new BigDecimal("72.00"))
                    .totalPrice(new BigDecimal("72.00"))
                    .build();
            order2.setItems(List.of(item2));
            orderRepository.save(order2);

            log.info("Pedidos de teste criados com sucesso!");
        }
    }
}
