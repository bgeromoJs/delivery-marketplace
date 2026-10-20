package com.delivery.tenant.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ThemeDto {
    private UUID tenantId;
    private String name;
    private String slug;
    private String logoUrl;
    private String bannerUrl;
    private String primaryColor;
    private String secondaryColor;
    private BigDecimal deliveryFee;
    private Integer deliveryTimeMin;
    private String address;
    private String phone;
    private BigDecimal rating;
}
