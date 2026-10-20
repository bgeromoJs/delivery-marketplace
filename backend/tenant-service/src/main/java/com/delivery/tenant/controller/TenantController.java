package com.delivery.tenant.controller;

import com.delivery.tenant.dto.ThemeDto;
import com.delivery.tenant.model.Tenant;
import com.delivery.tenant.service.TenantService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/tenants")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class TenantController {

    private final TenantService tenantService;

    @GetMapping
    public ResponseEntity<List<Tenant>> listAll(@RequestParam(required = false, defaultValue = "false") boolean all) {
        return ResponseEntity.ok(all ? tenantService.getAll() : tenantService.getAllActive());
    }

    @GetMapping("/{slug}")
    public ResponseEntity<Tenant> getBySlug(@PathVariable String slug) {
        return ResponseEntity.ok(tenantService.getBySlug(slug));
    }

    @GetMapping("/{slug}/theme")
    public ResponseEntity<ThemeDto> getTheme(@PathVariable String slug) {
        return ResponseEntity.ok(tenantService.getThemeBySlug(slug));
    }

    @PostMapping
    public ResponseEntity<Tenant> create(@RequestBody Tenant tenant) {
        return ResponseEntity.ok(tenantService.createTenant(tenant));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Tenant> updateStatus(@PathVariable UUID id, @RequestBody Map<String, String> body) {
        String status = body.getOrDefault("status", "ACTIVE");
        return ResponseEntity.ok(tenantService.updateStatus(id, status));
    }
}
