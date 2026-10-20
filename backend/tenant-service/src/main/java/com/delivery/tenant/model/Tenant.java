package com.delivery.tenant.model;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.domain.Persistable;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "tenants")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Tenant implements Persistable<UUID> {

    @Id
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String slug;

    private String description;

    private String logoUrl;

    private String bannerUrl;

    @Builder.Default
    private String primaryColor = "#E11D48";

    @Builder.Default
    private String secondaryColor = "#F43F5E";

    @Builder.Default
    private BigDecimal deliveryFee = new BigDecimal("6.90");

    @Builder.Default
    private Integer deliveryTimeMin = 40;

    @Builder.Default
    private String status = "ACTIVE"; // ACTIVE, PENDING, SUSPENDED

    private String address;

    private String phone;

    @Builder.Default
    private BigDecimal rating = new BigDecimal("4.8");

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Transient
    @Builder.Default
    private boolean isNew = true;

    @Override
    public boolean isNew() {
        return isNew;
    }

    @PrePersist
    public void prePersist() {
        if (this.id == null) {
            this.id = UUID.randomUUID();
        }
    }

    @PostPersist
    @PostLoad
    void markNotNew() {
        this.isNew = false;
    }
}
