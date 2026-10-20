package com.delivery.order.controller;

import com.delivery.order.dto.CreateOrderRequest;
import com.delivery.order.model.Order;
import com.delivery.order.model.OrderStatus;
import com.delivery.order.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class OrderController {

    private final OrderService orderService;

    @PostMapping
    public ResponseEntity<Order> createOrder(@Valid @RequestBody CreateOrderRequest request) {
        return ResponseEntity.ok(orderService.createOrder(request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Order> getOrderById(@PathVariable UUID id) {
        return ResponseEntity.ok(orderService.getOrderById(id));
    }

    @GetMapping("/tenant/{tenantId}")
    public ResponseEntity<List<Order>> getOrdersByTenant(@PathVariable UUID tenantId) {
        return ResponseEntity.ok(orderService.getOrdersByTenant(tenantId));
    }

    @GetMapping("/courier/{courierId}")
    public ResponseEntity<List<Order>> getOrdersByCourier(@PathVariable UUID courierId) {
        return ResponseEntity.ok(orderService.getOrdersByCourier(courierId));
    }

    @GetMapping("/available-deliveries")
    public ResponseEntity<List<Order>> getAvailableDeliveries() {
        return ResponseEntity.ok(orderService.getAvailableDeliveries());
    }

    @GetMapping
    public ResponseEntity<List<Order>> getAllOrders() {
        return ResponseEntity.ok(orderService.getAllOrders());
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Order> updateStatus(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        String statusStr = body.get("status");
        String courierIdStr = body.get("courierId");

        OrderStatus status = OrderStatus.valueOf(statusStr.toUpperCase());
        UUID courierId = courierIdStr != null && !courierIdStr.isBlank() ? UUID.fromString(courierIdStr) : null;

        return ResponseEntity.ok(orderService.updateStatus(id, status, courierId));
    }
}
