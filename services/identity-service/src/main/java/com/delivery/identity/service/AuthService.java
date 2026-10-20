package com.delivery.identity.service;

import com.delivery.identity.dto.AuthResponse;
import com.delivery.identity.dto.LoginRequest;
import com.delivery.identity.dto.RegisterRequest;
import com.delivery.identity.dto.UserDto;
import com.delivery.identity.model.User;
import com.delivery.identity.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Base64;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail().toLowerCase().trim())
                .orElseThrow(() -> new RuntimeException("Credenciais inválidas"));

        if (!user.getPassword().equals(request.getPassword())) {
            throw new RuntimeException("Credenciais inválidas");
        }

        String token = generateToken(user);
        return AuthResponse.of(token, UserDto.fromEntity(user));
    }

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail().toLowerCase().trim())) {
            throw new RuntimeException("Email já cadastrado");
        }

        User user = User.builder()
                .name(request.getName().trim())
                .email(request.getEmail().toLowerCase().trim())
                .password(request.getPassword())
                .phone(request.getPhone())
                .role(request.getRole())
                .tenantId(request.getTenantId())
                .build();

        user = userRepository.save(user);
        String token = generateToken(user);
        return AuthResponse.of(token, UserDto.fromEntity(user));
    }

    public UserDto getUserById(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
        return UserDto.fromEntity(user);
    }

    private String generateToken(User user) {
        String payload = user.getId() + ":" + user.getEmail() + ":" + user.getRole().name() + ":" + System.currentTimeMillis();
        return Base64.getEncoder().encodeToString(payload.getBytes());
    }
}
