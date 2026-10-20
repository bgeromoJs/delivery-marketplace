package com.delivery.catalog.controller;

import com.delivery.catalog.model.Dish;
import com.delivery.catalog.service.CatalogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/catalog")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CatalogController {

    private final CatalogService catalogService;

    @GetMapping("/tenants/{tenantId}/dishes")
    public ResponseEntity<List<Dish>> getDishesByTenant(
            @PathVariable UUID tenantId,
            @RequestParam(required = false, defaultValue = "false") boolean availableOnly) {
        return ResponseEntity.ok(catalogService.getDishesByTenant(tenantId, availableOnly));
    }

    @GetMapping("/tenants/{tenantId}/categories")
    public ResponseEntity<List<String>> getCategoriesByTenant(@PathVariable UUID tenantId) {
        return ResponseEntity.ok(catalogService.getCategoriesByTenant(tenantId));
    }

    @GetMapping("/dishes/{id}")
    public ResponseEntity<Dish> getDishById(@PathVariable UUID id) {
        return ResponseEntity.ok(catalogService.getDishById(id));
    }

    @PostMapping("/dishes")
    public ResponseEntity<Dish> createDish(@RequestBody Dish dish) {
        return ResponseEntity.ok(catalogService.createDish(dish));
    }

    @PatchMapping("/dishes/{id}/availability")
    public ResponseEntity<Dish> updateAvailability(@PathVariable UUID id, @RequestBody Map<String, Boolean> body) {
        boolean available = body.getOrDefault("available", true);
        return ResponseEntity.ok(catalogService.updateAvailability(id, available));
    }
}
