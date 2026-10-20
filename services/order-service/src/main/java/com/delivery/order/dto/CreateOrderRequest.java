package com.delivery.order.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
public class CreateOrderRequest {
    @NotNull(message = "tenantId é obrigatório")
    private UUID tenantId;

    private UUID customerId;

    @NotNull(message = "Nome do cliente é obrigatório")
    private String customerName;

    private String customerPhone;

    @NotNull(message = "Endereço de entrega é obrigatório")
    private String deliveryAddress;

    @NotNull(message = "Método de pagamento é obrigatório")
    private String paymentMethod; // PIX, CREDIT_CARD

    private String notes;

    private BigDecimal deliveryFee;

    @NotEmpty(message = "O pedido deve ter pelo menos um item")
    private List<CreateOrderItemDto> items;

    @Data
    public static class CreateOrderItemDto {
        @NotNull
        private UUID dishId;

        @NotNull
        private String dishName;

        @NotNull
        private Integer quantity;

        @NotNull
        private BigDecimal unitPrice;

        private String optionsJson;
    }
}
