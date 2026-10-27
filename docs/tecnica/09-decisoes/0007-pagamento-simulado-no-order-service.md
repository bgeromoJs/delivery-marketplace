# 0007 — Pagamento simulado dentro do order-service

| Campo | Valor |
|---|---|
| Status | Aceito, provisório |
| Data de registro | 2026-10-26 |
| Decisores | Equipe de produto e engenharia (registro retroativo) |
| Impacto | Produto |
| Substitui | — |
| Substituído por | — (candidato a substituição antes de cobrança real) |

## Contexto e problema

O fluxo de compra precisa avançar do carrinho para o pedido sem depender de um contrato com adquirente, certificação PCI ou conta de gateway de pagamento. Ao mesmo tempo, o modelo de pedido precisa de um estado que represente “pagamento confirmado” para que o vendedor só veja pedidos válidos.

Há duas necessidades conflitantes:

1. **Demonstrar o fluxo completo** (cliente → pedido → cozinha) hoje.
2. **Não criar um modelo de dados que impeça** a integração futura com um PSP.

> Como representar pagamento sem integrar um provedor real e sem comprometer a evolução?

## Forças de decisão

- **F1** — Não há contrato com PSP, conta de gateway ou certificação.
- **F2** — O pedido precisa nascer em um estado que o vendedor possa aceitar.
- **F3** — O escopo inclui Pix e cartão na interface, mas não cobrança real.
- **F4** — Evitar armazenar dados de cartão (escopo PCI).
- **F5** — O app Android e o web já exibem métodos de pagamento.

## Opções consideradas

### Opção 1 — Serviço de pagamento dedicado com PSP

Criar `payment-service` com integração a Stripe/Pagar.me/Mercado Pago, webhooks e conciliação.

**Prós**

- Modelo correto para produção.
- Isolamento de escopo PCI.
- Webhooks e reembolso bem definidos.

**Contras**

- Exige contrato, credenciais e homologação.
- Aumenta o número de serviços e bancos.
- Bloqueia a demonstração do fluxo até a integração estar pronta.

### Opção 2 — Pagamento simulado dentro do order-service (escolhida)

O pedido é criado diretamente com `status = PAID`. Não há entidade de pagamento, transação ou cobrança. Os métodos aceitos pela loja são fixos em memória (`PIX`, `CARD_ONLINE`).

**Prós**

- Fluxo completo demonstrável sem dependência externa.
- Nenhum dado sensível de cartão é armazenado.
- Implementação pequena e compreensível.
- Permite evoluir o modelo depois.

**Contras**

- Não há cobrança, conciliação, estorno ou recibo.
- `PAID` não corresponde a nenhum fato financeiro.
- Métodos de pagamento não são persistidos.
- Contratos divergem entre Android e backend.
- Não há idempotência: reenvio cria pedido duplicado.

### Opção 3 — Pagamento na entrega apenas

**Prós**

- Elimina a necessidade de PSP no início.
- Modelo simples e verdadeiro.

**Contras**

- Não cobre Pix/cartão, que já aparecem na interface.
- Reduz o valor do produto para o cliente final.

## Decisão

**Escolhemos a opção 2, explicitamente como provisória.**

Evidência em [`OrderService.createOrder`](../../../backend/order-service/src/main/java/com/delivery/order/service/OrderService.java):

```java
.status(OrderStatus.PAID) // Simulating automatic payment confirmation
```

E em [`StoreController`](../../../backend/tenant-service/src/main/java/com/delivery/tenant/controller/StoreController.java):

```java
private static final List<String> DEFAULT_METHODS = List.of("PIX", "CARD_ONLINE");

@PutMapping("/me/payments")
public ResponseEntity<Map<String, Object>> updatePayments(@RequestBody Map<String, Object> body) {
    // lê "enabledMethods", recalcula em memória e devolve; nada é persistido
}
```

Não existe tabela `payments`, `transactions` ou `payment_methods` em nenhum changelog.

## Consequências

### Positivas

- O fluxo cliente → pedido → aceite → preparo → entrega funciona de ponta a ponta.
- Nenhum dado de cartão é coletado ou armazenado.
- A decisão de negócio (“pedido pago”) é explícita no código, com comentário.
- Baixo custo para demonstrar e testar.

### Negativas

- **`PAID` é ficção.** Nenhum valor foi cobrado; relatórios de GMV e comissão não têm lastro.
- **Métodos de pagamento não persistem.** Reiniciar o serviço restaura `PIX` e `CARD_ONLINE`.
- **Android e backend divergem.** O app envia `{ "config": ... }`; o backend lê `enabledMethods` e ignora o corpo, retornando os padrões. A tela mostra a alteração, mas nada muda no servidor.
- **Sem idempotência.** Um duplo clique cria dois pedidos pagos.
- **Sem estorno ou cancelamento financeiro.** `CANCELLED` não dispara devolução.
- **Sem trilha de auditoria financeira.**
- **Endpoints abertos.** `PUT /api/store/me/payments` não exige autenticação (ver [`06-seguranca.md`](../06-seguranca.md)).

### Neutras

- O enum `OrderStatus` já contém `PAID`, o que preserva compatibilidade quando houver cobrança real.
- O frontend exibe Pix e cartão como opções de checkout.

## Riscos e mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Alguém interpretar `PAID` como receita real | Alta | Alto | Rotular a interface como simulação; não usar em relatórios financeiros |
| Pedido duplicado por reenvio | Alta | Médio | Chave de idempotência no `POST /api/orders` |
| Divergência Android/backend persistir | Alta | Médio | Contrato único + validação estrita |
| Integração futura exigir remodelagem | Média | Alto | Criar `payment_id`, `status`, `provider` desde já no modelo |
| Exposição de dados de pagamento | Baixa | Crítico | Não coletar dados de cartão até integração certificada |

## Condições para substituição

Este ADR deve ser substituído quando qualquer uma destas condições ocorrer:

1. Houver cobrança real de qualquer valor.
2. Um PSP for contratado.
3. Relatórios financeiros passarem a usar os dados de pedido.
4. O produto exigir estorno, conciliação ou recibo.

O novo ADR deve definir: provedor, modelo de dados, idempotência, webhooks, tratamento de falha e escopo PCI.

## Confirmação

- Nenhum relatório trata `PAID` como receita confirmada.
- A interface informa que o pagamento é simulado.
- Não há coleta de número de cartão, CVV ou validade.
- Toda alteração de métodos de pagamento é tratada como efêmera até existir persistência.

## Mais informações

- [`03-api.md`](../03-api.md) — contrato de pedidos e pagamentos
- [`04-dados.md`](../04-dados.md#9-dados-que-não-são-persistidos) — o que não é persistido
- [`06-seguranca.md`](../06-seguranca.md) — endpoints abertos de pagamento
- [PCI DSS](https://www.pcisecuritystandards.org/)
- [Idempotency-Key — IETF draft](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/)
