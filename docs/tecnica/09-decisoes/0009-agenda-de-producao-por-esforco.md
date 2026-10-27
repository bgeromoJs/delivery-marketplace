# 0009 — Agenda de produção por esforço e agenda pública da cozinha

| Campo | Valor |
|---|---|
| Status | Aceito |
| Data de registro | 2026-10-26 |
| Decisores | Equipe de engenharia |
| Impacto | Produto, dados e integração |
| Substitui | — |
| Substituído por | — |

## Contexto e problema

O checkout não tinha noção de capacidade da cozinha. Vários pedidos podiam ser aceitos para o mesmo horário, e o cliente não sabia quando a produção começaria. O catálogo já tinha `preparationTimeMin`, mas o campo é informativo, por prato, e não representa o esforço real de produzir uma unidade.

O cliente também não tinha visibilidade da fila. A única forma de acompanhar era o card do próprio pedido, sem saber quantos pedidos estavam à frente ou em que ordem a cozinha executaria o dia.

> Como reservar capacidade de produção por pedido, encaixar automaticamente pedidos sem horário e permitir que o cliente acompanhe a fila sem expor dados pessoais?

## Forças de decisão

- **F1** — O esforço precisa ser configurável por prato e multiplicado pela quantidade.
- **F2** — Pedido não recusado deve ocupar a agenda; recusa/cancelamento libera o intervalo.
- **F3** — Sem data escolhida, o pedido deve entrar na próxima janela com espaço, considerando a carga em andamento.
- **F4** — A agenda pública não pode expor nome, telefone, endereço ou valores.
- **F5** — Falha do catálogo não pode impedir o checkout.
- **F6** — A solução não deve introduzir infraestrutura nova nem lock distribuído no MVP.
- **F7** — O vendedor precisa ver a reserva no app web e no Android.

## Opções consideradas

### Opção 1 — Reutilizar `preparationTimeMin`

**Prós**

- Nenhum campo ou migração novo.
- Já existe no catálogo e no frontend.

**Contras**

- O campo descreve tempo de preparo, não esforço por unidade.
- Misturar os conceitos impede configurar, por exemplo, 20 min por batata e 12 min de preparo de uma pizza.
- Mudar o significado quebraria o dado existente.

### Opção 2 — `effortMinutes` por unidade + planejamento em memória (escolhida)

O catálogo ganha `effortMinutes` (default `20`). Na criação, o order-service consulta o catálogo, calcula `Σ esforço × quantidade`, cruza as janelas dos pratos e encaixa o pedido nos intervalos livres dos pedidos ativos.

**Prós**

- Separa esforço de produção de tempo de preparo.
- Reaproveita `salesDaysJson`/`salesWindowsJson` já existentes.
- Funciona sem tabela de slots e sem nova infraestrutura.
- O cliente escolhe data/janela ou deixa o encaixe automático.
- A agenda pública reutiliza os mesmos campos, sem duplicar dados.

**Contras**

- Planejamento em memória não tem lock: criações simultâneas podem reservar o mesmo intervalo.
- `LocalDateTime` sem fuso ignora DST e lojas em outros fusos.
- A agenda pública é pública e permite enumerar movimento da loja.
- A reserva é um snapshot; mudanças posteriores no catálogo não recalculam pedidos existentes.

### Opção 3 — Serviço de agenda com tabela de slots e lock

**Prós**

- Reserva atômica e consultas indexadas por slot.
- Base para capacidade por estação, pausas e reagendamento.

**Contras**

- Novo serviço/tabela e coordenação transacional entre order e agenda.
- Complexidade desproporcional ao MVP.
- Exige decisão de fuso, calendário e política de overbooking.

## Decisão

**Escolhemos a opção 2.**

A implementação fica no `order-service`, que já é o dono do pedido:

- `Dish.effortMinutes` (catalog-service) define o esforço por unidade; `catalog-004` adiciona a coluna com default `20`.
- `SchedulingService.plan` resolve o esforço, cruza dias/janelas dos itens e procura o primeiro intervalo livre. Sem data, varre até `app.scheduling.max-days-ahead` (default `7`); com data/janela, retorna `409` se não couber.
- `SchedulingService.planImmediate` atende o pedido de balcão: começa após a carga em produção, sem esperar janela de venda.
- Ocupam a agenda os status `PAID`, `ACCEPTED` e `PREPARING`. `CANCELLED`, `READY`, `PICKED_UP` e `DELIVERED` liberam o intervalo.
- `CatalogLookup` consulta `GET /api/catalog/tenants/{tenantId}/dishes` com timeout de 2 s e cai em fallback silencioso (`WARN`). O `effortMinutes` do request é fallback; o catálogo prevalece.
- A reserva é persistida em `orders.reserved_effort_minutes`, `scheduled_start`, `scheduled_end`, `scheduled_window` e `order_items.effort_minutes` (`order-006`).
- A agenda pública é `GET /api/orders/tenant/{tenantId}/agenda?date=AAAA-MM-DD`, ordenada por `scheduledStart → preparingAt → createdAt`, com `position` e payload sanitizado (`AgendaEntryDto`).
- A web mostra a agenda em `/loja/{slug}/agenda`, atualiza a cada 30 s e destaca o próprio pedido usando os números salvos em `localStorage`.
- O app vendedor Android mostra a mesma agenda na aba **Agenda** (`ui/agenda/AgendaScreen.kt`), com seletor de dia, resumo de pedidos/cozinha/esforço, pull-to-refresh e polling de 30 s.

## Consequências

### Positivas

- Checkout passa a reservar capacidade e devolve `409` quando não há espaço.
- Pedido sem horário é encaixado automaticamente, considerando o que já está em produção.
- Cliente entende quando a produção começa e em que ordem o dia será executado.
- Vendedor vê a reserva na fila web e no Android, além da agenda por dia no app.
- A agenda pública não expõe PII.
- Nenhuma infraestrutura nova.

### Negativas

- **Sem atomicidade.** Duas requisições concorrentes podem calcular o mesmo intervalo livre; não há unique constraint nem lock.
- **Sem fuso.** O cálculo usa `LocalDateTime.now()`; lojas em outro fuso ou horário de verão ficam incorretas.
- **Sem reagendamento.** Cancelar libera, mas não há rotina para reorganizar pedidos já reservados.
- **Snapshot.** Alterar `effortMinutes` depois do pedido não altera a reserva existente.
- **Agenda pública aberta.** Sem autenticação, terceiros podem enumerar movimento e itens da loja.
- **Polling.** A agenda do cliente e a aba do app vendedor não usam SSE; a atualização depende de 30 s e da tela visível.

### Neutras

- `preparationTimeMin` continua existindo e não participa da agenda.
- O fallback de janelas é `1..6` com `11:00-15:00` e `18:00-23:00`.
- `planImmediate` não grava `scheduledWindow`; deriva a janela do início e do fim quando necessário.

## Riscos e mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Overbooking por concorrência | Média | Alto | Constraint de exclusão por intervalo ou lock por tenant |
| Fuso/DST incorreto | Média | Médio | `ZoneId` por loja e persistência com offset |
| Catálogo fora do ar distorce a agenda | Média | Médio | Fallback por request/default; monitorar `WARN` |
| Agenda pública usada para enumerar a loja | Alta | Médio | Sessão de cliente/link assinado e rate limit |
| Cliente não encontra o próprio pedido | Baixa | Baixo | Números em `localStorage`; fallback visual pela lista |
| Snapshot divergir do catálogo atual | Média | Baixo | Recalcular apenas em novo pedido; documentar a limitação |

## Confirmação

- Criar dois pedidos de 200 min na mesma janela de 240 min: o segundo deve receber `409` ou um horário posterior.
- Pedido sem data deve começar depois da carga ativa e dentro de uma janela válida.
- Pedido de balcão deve começar no fim da carga em produção, mesmo fora da janela de venda.
- `GET /agenda` não deve conter nome, telefone, endereço, preço ou total.
- Com o catálogo parado, o checkout deve continuar usando o esforço do request/default.
- Web e Android devem exibir `scheduledWindow`, `scheduledStart`, `scheduledEnd` e esforço.
- A aba Agenda do Android deve respeitar o dia selecionado e listar os pedidos na ordem de execução.

## Mais informações

- [`../02-arquitetura.md`](../02-arquitetura.md#69-agenda-de-produção-e-agenda-pública) — fluxo de runtime
- [`../03-api.md`](../03-api.md#63-disponibilidade-e-agenda-de-produção) — contrato de disponibilidade e agenda
- [`../04-dados.md`](../04-dados.md#34-order) — colunas de reserva
- [`../05-operacao.md`](../05-operacao.md) — variáveis `CATALOG_SERVICE_URL`, `SCHEDULING_*`
- [`../06-seguranca.md`](../06-seguranca.md#l11--agenda-pública-sem-autenticação-média) — risco da agenda pública
