package com.delivery.order.repository;

import com.delivery.order.model.Order;
import com.delivery.order.model.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface OrderRepository extends JpaRepository<Order, UUID> {
    List<Order> findByTenantIdOrderByCreatedAtDesc(UUID tenantId);
    List<Order> findByCourierIdOrderByCreatedAtDesc(UUID courierId);
    List<Order> findByCustomerIdOrderByCreatedAtDesc(UUID customerId);
    List<Order> findByStatusAndCourierIdIsNullOrderByCreatedAtDesc(OrderStatus status);
    List<Order> findAllByOrderByCreatedAtDesc();
}
