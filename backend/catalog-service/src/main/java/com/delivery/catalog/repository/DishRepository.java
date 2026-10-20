package com.delivery.catalog.repository;

import com.delivery.catalog.model.Dish;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DishRepository extends JpaRepository<Dish, UUID> {
    List<Dish> findByTenantId(UUID tenantId);
    List<Dish> findByTenantIdAndAvailable(UUID tenantId, Boolean available);
    
    @Query("SELECT DISTINCT d.category FROM Dish d WHERE d.tenantId = :tenantId")
    List<String> findCategoriesByTenantId(UUID tenantId);
}
