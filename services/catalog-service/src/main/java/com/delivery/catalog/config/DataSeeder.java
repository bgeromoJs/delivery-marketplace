package com.delivery.catalog.config;

import com.delivery.catalog.model.Dish;
import com.delivery.catalog.repository.DishRepository;
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

    private final DishRepository dishRepository;

    @Override
    public void run(String... args) {
        if (dishRepository.count() == 0) {
            log.info("Populando cardápios de teste...");

            UUID pizzariaId = UUID.fromString("11111111-1111-1111-1111-111111111111");
            UUID burgerId = UUID.fromString("22222222-2222-2222-2222-222222222222");
            UUID sushiId = UUID.fromString("33333333-3333-3333-3333-333333333333");

            // --- Pizzaria do João ---
            dishRepository.save(Dish.builder()
                    .tenantId(pizzariaId)
                    .name("Pizza Calabresa Especial")
                    .description("Molho de tomate pelati, mussarela de búfala, fatias crocantes de calabresa artesanal e cebola roxa.")
                    .price(new BigDecimal("54.90"))
                    .category("Pizzas Salgadas")
                    .imageUrl("https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=500&h=350&fit=crop")
                    .available(true)
                    .preparationTimeMin(30)
                    .build());

            dishRepository.save(Dish.builder()
                    .tenantId(pizzariaId)
                    .name("Pizza Margherita Gourmet")
                    .description("Molho rústico, fior di latte fresco, tomates cereja confitados e manjericão fresco colhido no dia.")
                    .price(new BigDecimal("58.00"))
                    .category("Pizzas Salgadas")
                    .imageUrl("https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=500&h=350&fit=crop")
                    .available(true)
                    .preparationTimeMin(25)
                    .build());

            dishRepository.save(Dish.builder()
                    .tenantId(pizzariaId)
                    .name("Pizza Quatro Queijos Prime")
                    .description("Mussarela, gorgonzola dolce, catupiry original e lascas de parmesão maturado.")
                    .price(new BigDecimal("62.50"))
                    .category("Pizzas Salgadas")
                    .imageUrl("https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&h=350&fit=crop")
                    .available(true)
                    .preparationTimeMin(28)
                    .build());

            dishRepository.save(Dish.builder()
                    .tenantId(pizzariaId)
                    .name("Coca-Cola Original 2L")
                    .description("Garrafa de 2 litros gelada.")
                    .price(new BigDecimal("14.00"))
                    .category("Bebidas")
                    .imageUrl("https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&h=350&fit=crop")
                    .available(true)
                    .preparationTimeMin(5)
                    .build());

            // --- Burger Artesanal ---
            dishRepository.save(Dish.builder()
                    .tenantId(burgerId)
                    .name("Smash Burger Duplo Cheddar")
                    .description("Dois ultra smash burgers (90g cada), cheddar inglês derretido, bacon em tiras e maionese defumada.")
                    .price(new BigDecimal("38.90"))
                    .category("Burgers")
                    .imageUrl("https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&h=350&fit=crop")
                    .available(true)
                    .preparationTimeMin(20)
                    .build());

            dishRepository.save(Dish.builder()
                    .tenantId(burgerId)
                    .name("Batata Rústica com Alecrim")
                    .description("Batatas com corte especial rústico, alecrim fresco e alho confitado.")
                    .price(new BigDecimal("18.50"))
                    .category("Acompanhamentos")
                    .imageUrl("https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&h=350&fit=crop")
                    .available(true)
                    .preparationTimeMin(15)
                    .build());

            // --- Sushi Prime ---
            dishRepository.save(Dish.builder()
                    .tenantId(sushiId)
                    .name("Combo Salmão Supremo (24 peças)")
                    .description("8 uramakis salmão philadelphia, 8 sashimis de salmão fresco, 4 niguiris e 4 jows especiais.")
                    .price(new BigDecimal("79.90"))
                    .category("Combinados")
                    .imageUrl("https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=500&h=350&fit=crop")
                    .available(true)
                    .preparationTimeMin(35)
                    .build());

            log.info("Cardápios cadastrados com sucesso!");
        }
    }
}
