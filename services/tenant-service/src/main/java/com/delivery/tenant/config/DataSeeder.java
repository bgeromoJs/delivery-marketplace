package com.delivery.tenant.config;

import com.delivery.tenant.model.Tenant;
import com.delivery.tenant.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final TenantRepository tenantRepository;

    @Override
    public void run(String... args) {
        if (tenantRepository.count() == 0) {
            log.info("Populando lojas padrão de teste...");

            tenantRepository.save(Tenant.builder()
                    .id(UUID.fromString("11111111-1111-1111-1111-111111111111"))
                    .name("Pizzaria do João")
                    .slug("pizzaria-do-joao")
                    .description("As melhores pizzas artesanais em forno a lenha da cidade.")
                    .logoUrl("https://images.unsplash.com/photo-1513104890138-7c749659a591?w=160&h=160&fit=crop")
                    .bannerUrl("https://images.unsplash.com/photo-1579751626657-72bc17010498?w=1200&h=400&fit=crop")
                    .primaryColor("#E11D48")
                    .secondaryColor("#BE123C")
                    .deliveryFee(new BigDecimal("6.90"))
                    .deliveryTimeMin(35)
                    .status("ACTIVE")
                    .address("Rua das Flores, 120 - Centro")
                    .phone("(11) 3456-7890")
                    .rating(new BigDecimal("4.9"))
                    .build());

            tenantRepository.save(Tenant.builder()
                    .id(UUID.fromString("22222222-2222-2222-2222-222222222222"))
                    .name("Burger King Artesanal")
                    .slug("burger-artesanal")
                    .description("Smash burgers suculentos com molhos especiais e fritas crocantes.")
                    .logoUrl("https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=160&h=160&fit=crop")
                    .bannerUrl("https://images.unsplash.com/photo-1550547660-d9450f859349?w=1200&h=400&fit=crop")
                    .primaryColor("#D97706")
                    .secondaryColor("#B45309")
                    .deliveryFee(new BigDecimal("7.50"))
                    .deliveryTimeMin(30)
                    .status("ACTIVE")
                    .address("Av. Paulista, 980 - Bela Vista")
                    .phone("(11) 3890-1122")
                    .rating(new BigDecimal("4.8"))
                    .build());

            tenantRepository.save(Tenant.builder()
                    .id(UUID.fromString("33333333-3333-3333-3333-333333333333"))
                    .name("Sushi Prime Delivery")
                    .slug("sushi-prime")
                    .description("Combinados frescos e tradicionais preparados por sushimen experientes.")
                    .logoUrl("https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=160&h=160&fit=crop")
                    .bannerUrl("https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=1200&h=400&fit=crop")
                    .primaryColor("#0F172A")
                    .secondaryColor("#334155")
                    .deliveryFee(new BigDecimal("9.90"))
                    .deliveryTimeMin(45)
                    .status("ACTIVE")
                    .address("Rua Oscar Freire, 400 - Jardins")
                    .phone("(11) 3100-2233")
                    .rating(new BigDecimal("4.9"))
                    .build());

            log.info("Lojas padrão criadas com sucesso!");
        }
    }
}
