package com.delivery.tenant.service;

import com.delivery.tenant.dto.ThemeDto;
import com.delivery.tenant.model.Tenant;
import com.delivery.tenant.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TenantService {

    private final TenantRepository tenantRepository;

    public List<Tenant> getAllActive() {
        return tenantRepository.findByStatus("ACTIVE");
    }

    public List<Tenant> getAll() {
        return tenantRepository.findAll();
    }

    public Tenant getBySlug(String slug) {
        return tenantRepository.findBySlug(slug.toLowerCase().trim())
                .orElseThrow(() -> new RuntimeException("Loja não encontrada com slug: " + slug));
    }

    public Tenant getById(UUID id) {
        return tenantRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Loja não encontrada com id: " + id));
    }

    public ThemeDto getThemeBySlug(String slug) {
        Tenant tenant = getBySlug(slug);
        return ThemeDto.builder()
                .tenantId(tenant.getId())
                .name(tenant.getName())
                .slug(tenant.getSlug())
                .logoUrl(tenant.getLogoUrl())
                .bannerUrl(tenant.getBannerUrl())
                .primaryColor(tenant.getPrimaryColor())
                .secondaryColor(tenant.getSecondaryColor())
                .deliveryFee(tenant.getDeliveryFee())
                .deliveryTimeMin(tenant.getDeliveryTimeMin())
                .address(tenant.getAddress())
                .phone(tenant.getPhone())
                .rating(tenant.getRating())
                .build();
    }

    public Tenant createTenant(Tenant tenant) {
        if (tenantRepository.existsBySlug(tenant.getSlug().toLowerCase().trim())) {
            throw new RuntimeException("Já existe uma loja cadastrada com este slug");
        }
        tenant.setSlug(tenant.getSlug().toLowerCase().trim());
        return tenantRepository.save(tenant);
    }

    public Tenant updateStatus(UUID id, String status) {
        Tenant tenant = getById(id);
        tenant.setStatus(status.toUpperCase().trim());
        return tenantRepository.save(tenant);
    }
}
