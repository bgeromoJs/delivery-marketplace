package com.delivery.identity.config;

import com.delivery.identity.model.Role;
import com.delivery.identity.model.User;
import com.delivery.identity.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;

    @Override
    public void run(String... args) {
        if (userRepository.count() == 0) {
            log.info("Populando usuários padrão de teste...");

            UUID tenantId = UUID.fromString("11111111-1111-1111-1111-111111111111");

            userRepository.save(User.builder()
                    .name("Administrador da Plataforma")
                    .email("admin@delivery.com")
                    .password("admin123")
                    .phone("(11) 99999-0001")
                    .role(Role.ADMIN)
                    .build());

            userRepository.save(User.builder()
                    .name("João da Silva (Pizzaria)")
                    .email("joao@pizzaria.com")
                    .password("loja123")
                    .phone("(11) 99999-0002")
                    .role(Role.SELLER)
                    .tenantId(tenantId)
                    .build());

            userRepository.save(User.builder()
                    .name("Carlos Entregador")
                    .email("carlos@moto.com")
                    .password("entrega123")
                    .phone("(11) 99999-0003")
                    .role(Role.COURIER)
                    .build());

            userRepository.save(User.builder()
                    .name("Maria Cliente")
                    .email("maria@gmail.com")
                    .password("cliente123")
                    .phone("(11) 99999-0004")
                    .role(Role.CUSTOMER)
                    .build());

            log.info("Usuários padrão criados com sucesso!");
        }
    }
}
