# 0008 — Eventos de pedido por SSE e Kafka

| Campo | Valor |
|---|---|
| Status | Aceito |
| Data de registro | 2026-10-26 |
| Decisores | Equipe de engenharia |
| Impacto | Integração |
| Substitui | — |
| Substituído por | — |

## Contexto e problema

O app do vendedor só descobria pedidos novos ao abrir a tela ou puxar para atualizar. Em operação de balcão, isso significa atraso entre o pedido chegar e a cozinha começar a prepará-lo.

O `docker-compose.yml` já provisionava o Redpanda, mas nenhum serviço publicava ou consumia eventos. Era infraestrutura sem função.

> Como avisar o vendedor sobre pedidos novos em tempo real sem introduzir acoplamento síncrono e sem tornar o checkout dependente de um broker?

## Forças de decisão

- **F1** — O checkout não pode falhar nem ficar mais lento por causa de mensageria.
- **F2** — O app Android precisa receber o pedido já pronto para renderizar, sem nova chamada.
- **F3** — O evento deve ser emitido apenas depois do commit da transação.
- **F4** — O Redpanda já existe no ambiente; usá-lo evita nova infraestrutura.
- **F5** — A solução precisa funcionar mesmo sem broker no ar.
- **F6** — Um futuro `notification-service` (FCM) deve poder consumir o mesmo evento.

## Opções consideradas

### Opção 1 — Polling mais frequente

**Prós**

- Nenhuma infraestrutura nova.
- Simples de implementar.

**Contras**

- Latência e carga proporcionais à frequência.
- Não resolve o caso de app em background.
- Desperdício de requisições ociosas.

### Opção 2 — WebSocket dedicado

**Prós**

- Bidirecional.
- Modelo consolidado para tempo real.

**Contras**

- Exige servidor com estado e escala própria.
- Mais complexo que SSE para fluxo unidirecional.

### Opção 3 — SSE para o app + Kafka para o barramento (escolhida)

O order-service publica um evento interno; depois do commit, entrega por SSE às conexões abertas e publica no tópico `order-events`.

**Prós**

- SSE é HTTP nativo, funciona pelo gateway e reconecta sozinho.
- Kafka desacopla consumidores futuros.
- Publicação assíncrona isola o checkout de falha do broker.
- Um único contrato (`OrderEvent`) para os dois canais.

**Contras**

- SSE em memória não escala horizontalmente.
- Sem consumidor Kafka, o tópico é um custo sem retorno imediato.
- Dois canais para manter e testar.
- Sem garantia de entrega (*at-least-once*) nem replay no SSE.

## Decisão

**Escolhemos a opção 3.**

Cadeia implementada:

```text
OrderService
  └─ ApplicationEventPublisher.publishEvent(OrderChangedEvent)
       └─ OrderEventDispatcher
            @TransactionalEventListener(AFTER_COMMIT, fallbackExecution = true)
              ├─ SseOrderEventRegistry.broadcast(OrderEvent)
              └─ KafkaOrderEventPublisher.publish(OrderEvent)
```

| Elemento | Arquivo | Comportamento |
|---|---|---|
| Evento interno | `OrderChangedEvent` | Publicado na transação do pedido |
| Distribuição | [`OrderEventDispatcher`](../../../backend/order-service/src/main/java/com/delivery/order/event/OrderEventDispatcher.java) | Só após o commit |
| SSE | [`SseOrderEventRegistry`](../../../backend/order-service/src/main/java/com/delivery/order/event/SseOrderEventRegistry.java) | Conexões em memória, heartbeat de 20 s |
| Kafka | [`KafkaOrderEventPublisher`](../../../backend/order-service/src/main/java/com/delivery/order/event/KafkaOrderEventPublisher.java) | Thread própria, timeout de 5 s |
| Endpoint | `GET /api/store/me/orders/stream` | `text/event-stream` |
| Tópico | `order-events` | Chave = `tenantId` |

Contrato do evento:

```json
{
  "type": "ORDER_CREATED",
  "tenantId": "11111111-1111-1111-1111-111111111111",
  "order": { "number": "4505", "status": "NEW", "total": 35.90 },
  "occurredAt": "2026-10-26T03:35:30.217818700Z"
}
```

Tipos: `ORDER_CREATED`, `ORDER_UPDATED`, `ORDER_CANCELLED`. O campo `order` é o mesmo `StoreOrderDto` de `GET /api/store/me/orders`.

Configuração:

```yaml
spring:
  kafka:
    bootstrap-servers: ${KAFKA_BOOTSTRAP_SERVERS:localhost:19092}
    producer:
      properties:
        max.block.ms: 2000
        request.timeout.ms: 3000
        delivery.timeout.ms: 5000
app:
  events:
    kafka:
      enabled: ${KAFKA_ENABLED:true}
      topic: ${KAFKA_ORDER_TOPIC:order-events}
```

## Consequências

### Positivas

- Pedido novo aparece no app sem refresh manual.
- Checkout não depende do broker: falha gera `WARN` e o pedido permanece válido.
- Evento só é emitido após o commit, evitando avisar sobre transação revertida.
- O tópico está pronto para um `notification-service` consumir.
- O contrato é único para SSE e Kafka.

### Negativas

- **Sem consumidor.** O tópico acumula eventos sem uso; retenção e custo precisam ser definidos.
- **SSE em memória.** Com mais de uma instância, cada vendedor só recebe eventos da instância conectada.
- **Sem replay.** Se a conexão cair, o app recarrega a lista; eventos intermediários não são reenviados.
- **Sem autenticação no stream.** O endpoint é público e resolve a loja pela primeira ativa, como o restante de `/api/store/**`.
- **PII no barramento.** O payload contém nome, telefone e endereço; o Redpanda não tem SASL/TLS.
- **Entrega não garantida.** `max.block.ms` curto prioriza o checkout em detrimento da publicação.
- **Sem Outbox.** Se o processo morrer entre o commit e a publicação, o evento é perdido.

### Neutras

- O heartbeat usa `@EnableScheduling` e `app.events.heartbeat-ms` (padrão 20 s).
- `KAFKA_ENABLED=false` mantém o SSE e desliga o Kafka.

## Riscos e mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Evento perdido entre commit e publish | Média | Médio | Outbox transacional |
| SSE não escala | Alta ao escalar | Alto | Consumir `order-events` por instância ou Realtime Gateway |
| Vazamento de PII no tópico | Média | Alto | SASL/TLS, ACLs, retenção curta, console desabilitado |
| Consumidor futuro mudar o contrato | Média | Médio | Versionar o evento e testar compatibilidade |
| Broker indisponível gera ruído de log | Alta | Baixo | `KAFKA_ENABLED=false` onde não há broker |
| App não reconecta | Baixa | Médio | Backoff no Android + recarga ao reconectar |

## Confirmação

- Criar um pedido gera evento no SSE em menos de 1 s.
- Com o Redpanda parado, o pedido é criado e o SSE continua funcionando.
- `KAFKA_ENABLED=false` não publica nada e não gera erro.
- O tópico `order-events` contém o mesmo payload observado no SSE.

## Mais informações

- [`../02-arquitetura.md`](../02-arquitetura.md#810-mensageria-e-tempo-real) — visão arquitetural
- [`../03-api.md`](../03-api.md) — endpoint SSE
- [`../../tempo-real-pedidos.md`](../../tempo-real-pedidos.md) — guia operacional e próximo passo (FCM)
- [Spring — Transactional Event Listeners](https://docs.spring.io/spring-framework/reference/data-access/transaction/event.html)
- [Server-Sent Events — MDN](https://developer.mozilla.org/docs/Web/API/Server-sent_events)
- [Apache Kafka Documentation](https://kafka.apache.org/documentation/)
