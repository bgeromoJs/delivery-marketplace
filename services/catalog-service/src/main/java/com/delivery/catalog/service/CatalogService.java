package com.delivery.catalog.service;

import com.delivery.catalog.model.Dish;
import com.delivery.catalog.repository.DishRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CatalogService {

    private final DishRepository dishRepository;

    public List<Dish> getDishesByTenant(UUID tenantId, Boolean onlyAvailable) {
        if (Boolean.TRUE.equals(onlyAvailable)) {
            return dishRepository.findByTenantIdAndAvailable(tenantId, true);
        }
        return dishRepository.findByTenantId(tenantId);
    }

    public List<String> getCategoriesByTenant(UUID tenantId) {
        return dishRepository.findCategoriesByTenantId(tenantId);
    }

    public Dish getDishById(UUID id) {
        return dishRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Prato não encontrado com ID: " + id));
    }

    public Dish createDish(Dish dish) {
        return dishRepository.save(dish);
    }

    public Dish updateAvailability(UUID id, boolean available) {
        Dish dish = getDishById(id);
        dish.setAvailable(available);
        return dishRepository.save(dish);
    }
}
