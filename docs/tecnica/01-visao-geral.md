# 01 — Visão geral

| Campo | Valor |
|---|---|
| Status | Implementado / Parcial (ver matriz) |
| Público | Produto, engenharia, operações e novos integrantes |
| Última revisão | 2026-10-28 |
| Fonte de verdade | Código em `backend/`, `frontend/`, `mobile/` e configurações do repositório |

---

## 1. Identificação

| Item | Valor |
|---|---|
| Produto | Delivery Marketplace multi-tenant |
| Repositório | `delivery-marketplace` |
| Branch de referência | `master` |
| Commit de referência | `51c6bd9` (2026-10-19) + alterações locais no diretório de trabalho |
| Backend | Java 21, Spring Boot 4.1.1, Spring Cloud 2025.1.3, Maven |
| Banco | PostgreSQL 16, um banco por serviço, Liquibase |
| Frontend | Next.js 16.4.2, React 19.3.0, TypeScript, Tailwind CSS 4 |
| Mobile | Android nativo, Kotlin 2.0.20, Jetpack Compose, Retrofit/Moshi |
| Autenticação | JWT HS256 emitido pelo `identity-service` |

> O commit `51c6bd9` é a última referência versionada. O diretório de trabalho contém alterações locais não commitadas que também foram consideradas nesta documentação. Antes de comparar com outra revisão, confira `git status` e `git log`.

---

## 2. Contexto e problema

O projeto implementa um marketplace de delivery com cinco perfis:

- **Cliente**: entra no app com a conta `CUSTOMER`; as lojas entram na conta quando ele abre o link do estabelecimento. Monta o carrinho, escolhe pagamento e acompanha o pedido.
- **Vendedor**: gerencia a loja, o cardápio e a fila de pedidos.
- **Entregador**: visualiza ofertas, aceita corridas e atualiza a entrega.
- **Analista de suporte**: opera a fila do painel, consulta lojas, entregadores e pedidos, sem gerir usuários ou configurações.
- **Administrador**: aprova e suspende lojas, gerencia usuários, configura regras da plataforma e audita ações.

O problema de negócio é permitir que múltiplas lojas compartilhem a mesma plataforma, com identidade visual própria (`slug` + tema), mantendo dados isolados por loja e uma operação centralizada.

A implementação atual é um **MVP funcional de ponta a ponta**, com pagamento simulado, eventos de pedido por SSE e Kafka (sem consumidor) e sem a plataforma de dispatch e financeiro descrita em [`../arquitetura.md`](../arquitetura.md).

---

## 3. Proposta de valor implementada

| Capacidade | O que o sistema entrega hoje |
|---|---|
| Tema por loja | Tema (cores, logo, banner), slug, taxa e prazo de entrega por loja; o app cliente é único e assume a marca da loja ativa. |
| Catálogo | Pratos com categoria, preço, descrição, imagem, disponibilidade, esforço de cozinha por unidade e metadados de horário/opcionais em JSON. |
| Checkout | Criação de pedido com itens, endereço, pagamento, taxa e escolha de janela de produção; o pedido nasce como `PAID` (pagamento simulado). |
| Agenda de produção | Cada pedido reserva um intervalo calculado pelo esforço dos pratos; a agenda considera a carga ativa da cozinha. |
| Agenda pública | Cliente escolhe o dia na web `/loja/{slug}/agenda` ou na aba **Agenda** do app vendedor e vê os pedidos na ordem de execução, sem dados pessoais. |
| Operação do vendedor | Fila de pedidos, aceite, preparo, pronto, recusa, pedidos de balcão e agenda de produção por dia no app Android. |
| Operação do entregador | Lista de pedidos `READY` sem entregador, aceite, retirada e entrega (simulador web). |
| Administração | CRUD de lojas, usuários e configurações, auditoria, leitura e cancelamento de pedidos. |
| Autenticação | Login, JWT, cadastro público de cliente e recuperação de senha de `ADMIN` por SMS. |
| App vendedor Android | Login, dados da loja, pagamentos, pedidos, cardápio e agenda de produção. |
| App cliente Android | Login obrigatório (e-mail/senha ou Google), lista de estabelecimentos vinculados pelo link da loja, cardápio, carrinho, checkout com janelas, histórico de pedidos com comanda de acompanhamento e perfil com endereços e cartões. |
| Meus estabelecimentos | Cada loja cujo link o cliente abriu entra na conta (`customer_stores`) e na lista inicial do app; com uma única loja o cardápio abre direto. |

---

## 4. Personas e jornadas

### 4.1 Cliente

- Entra em `/loja/{slug}`.
- O frontend busca a loja por slug e o cardápio por `tenantId`.
- Monta o carrinho, informa nome, telefone, endereço e forma de pagamento.
- Vê o esforço de cozinha do carrinho e escolhe entre a próxima janela disponível ou uma janela específica.
- Cria o pedido em `POST /api/orders`; a criação reserva a agenda da cozinha.
- Pode abrir `/loja/{slug}/agenda`, escolher o dia e acompanhar os pedidos na ordem de execução. O próprio pedido é destacado por um número salvo no `localStorage`.
- No app Android, o login é obrigatório: entra com conta `CUSTOMER` (e-mail/senha ou Google), monta o carrinho, escolhe endereço e cartão salvos, agenda a entrega e acompanha o pedido na aba **Pedidos**, com histórico do mais recente para o mais antigo e comanda com a linha do tempo do status.
- A loja **não** vem do build: o cliente abre o link do estabelecimento (`deliveryhub://loja/{slug}` ou `https://.../loja/{slug}`). O app valida o slug em `GET /api/tenants/{slug}/theme` e grava o vínculo em `POST /api/customers/me/stores`; a loja passa a aparecer na lista inicial e o cliente entra na lista de clientes daquela loja.
- Com uma única loja vinculada o app abre o cardápio direto; com duas ou mais mostra a lista de estabelecimentos. A aba **Lojas** aparece nesse estado; dentro do cardápio, o botão **Trocar** volta para a lista e troca de loja limpa o carrinho, com aviso.
- O histórico de pedidos é global (todas as lojas) e cada pedido exibe o nome da loja no card e na comanda.
- A página web mantém o pedido ativo em memória e permite **avançar o status manualmente** para simular o acompanhamento (`PAID` → `ACCEPTED` → `PREPARING` → `READY` → `DELIVERED`).
- Na web não há login de cliente, histórico, endereço salvo ou rastreamento real; essas capacidades existem apenas no app Android, que também não tem mapa do entregador (ver [§5](#5-escopo-implementado-por-capacidade) e [`03-api.md`](03-api.md#11-lacunas-conhecidas-do-contrato)).

### 4.2 Vendedor

- Acessa `/vendedor/login` e autentica com uma conta `SELLER` vinculada a um `tenantId`.
- A sessão é validada no cliente e guardada em `localStorage`.
- A página `/vendedor` carrega a loja, os pedidos e o cardápio.
- Pode aceitar, preparar, marcar como pronto e recusar pedidos.
- Pode criar pedidos de balcão (`origin = COUNTER`).
- O app Android oferece o mesmo núcleo, com sessão em `EncryptedSharedPreferences`.
- A aba **Agenda** do app lista os pedidos do dia na ordem de execução, com seletor de data, resumo de esforço, pull-to-refresh e atualização automática a cada 30 s.

Limitação importante: as chamadas do vendedor web para catálogo e pedidos **não enviam o token**; funcionam porque esses endpoints estão públicos no gateway. Ver [`06-seguranca.md`](06-seguranca.md).

### 4.3 Entregador

- Acessa `/entregador` (não há login).
- Vê pedidos `READY` sem entregador, com atualização a cada 8 segundos.
- Aceita uma entrega, confirma a retirada e confirma a entrega.
- O fluxo é um **simulador**: não há vínculo real com a conta do entregador, GPS, rota ou comprovação.
- O aceite envia `courierId = "courier-carlos-1"`, que não é UUID e provoca erro no backend. Ver [`03-api.md`](03-api.md#11-lacunas-conhecidas-do-contrato).

### 4.4 Administrador e analista de suporte

- Acessam `/admin/login`; a conta precisa ter papel `ADMIN` ou `SUPPORT`.
- O dashboard inicial monta uma fila de suporte a partir de pedidos `READY` sem entregador e lojas `PENDING`.
- As telas de vendedores, entregadores, pedidos e configurações consomem a API administrativa.
- O `ADMIN` gerencia usuários em `/admin/usuarios`, define perfil (cliente, entregador, vendedor, suporte ou administrador), loja e situação da conta, cria lojas, vincula vendedor, edita regras e consulta auditoria.
- O `SUPPORT` vê as telas operacionais e pode consultar a lista de usuários para identificar entregadores, mas não acessa “Usuários” nem “Configurações”.
- Não há métricas financeiras reais de GMV, comissão ou repasse; a página inicial do repositório descreve essas capacidades como visão de produto.

---

## 5. Escopo implementado por capacidade

| Capacidade | Status | Evidência no código | Limitações |
|---|---|---|---|
| Login e emissão de JWT | **Implementado** | `AuthService.login`, `JwtConfiguration` | Token de 60 min, sem refresh; credenciais inválidas retornam 401 e conta inativa 403. |
| Registro público | **Implementado** | `AuthService.register` | Cria apenas `CUSTOMER`; os demais perfis são criados pelo painel. |
| Gestão de usuários | **Implementado** | `AdminUserRequest`, `AuthService.createManagedUser`, `/admin/usuarios` | Perfil + loja + situação; sem validação de existência do tenant no identity. |
| Recuperação de senha por SMS | **Implementado** | `AuthService.forgotPassword`, `TwilioSmsService` | Exige Twilio configurado; código de 8 dígitos, 10 min, 5 tentativas. |
| Autorização por papel | **Parcial** | `SecurityConfiguration` do gateway e do identity | Rotas de usuários e mutações de tenant protegidas; catálogo, pedidos e store estão abertos. |
| CRUD de lojas | **Implementado** | `TenantController`, `TenantService` | Sem exclusão; unicidade de slug; sem isolamento por usuário. |
| Tema por slug | **Implementado** | `GET /api/tenants/{slug}/theme` | Retorna dados de marca e entrega. |
| Catálogo público | **Implementado** | `CatalogController` | Escritas também são públicas. |
| Cardápio do vendedor | **Implementado** | `StoreCatalogController` | Lista todos os pratos, não só os da loja; campos JSON são texto livre. |
| Esforço de cozinha por prato | **Implementado** | `Dish.effortMinutes`, `PUT /api/store/me/dishes/{id}` | Default `20`; catálogo prevalece sobre o valor enviado no checkout. |
| Agenda de produção | **Implementado** | `SchedulingService`, `POST /api/orders/availability` | Reserva por esforço e janelas; horário local sem fuso; sem histórico de reagendamento. |
| Agenda pública da cozinha | **Implementado** | `OrderService.getAgenda`, `/loja/{slug}/agenda`, `ui/agenda/AgendaScreen.kt` | Sanitizada; consumida pela web do cliente e pela aba Agenda do app vendedor; sem autenticação, paginação ou SSE (polling de 30 s). |
| Criação de pedido | **Implementado** | `OrderService.createOrder` | Nasce `PAID` e reserva a agenda; sem validação de preço, existência do prato ou tenant. |
| Fila do vendedor | **Implementado** | `StoreOrderController` | Lista pedidos de todas as lojas; preparo em FIFO por `preparingAt`; sem paginação. |
| Pedido de balcão | **Implementado** | `POST /api/store/me/orders/counter` | Nasce `PREPARING`, taxa zero, origem `COUNTER`. |
| Ciclo de status | **Parcial** | `PATCH /api/orders/{id}/status` | Aceita qualquer status e qualquer `courierId`; sem máquina de estados. |
| Entregadores | **Parcial** | `Courier`, `StoreController`, `StoreDataSeeder` | Apenas listagem; sem CRUD, dispatch, tracking ou pagamentos. |
| Pagamentos | **Parcial** | `StoreController` | Métodos em memória; não persiste; propostas são no-op. |
| Administração | **Implementado** | `AuthController`, `TenantController`, `AdminConfigurationService` | Sem métricas financeiras; auditoria só de ações administrativas. |
| App vendedor Android | **Implementado** | `ApiService.kt`, `SessionStore.kt`, `ui/agenda/AgendaScreen.kt` | Agenda por dia com seleção de data e polling de 30 s. Atualização de pagamentos ainda com payload incompatível. |
| App cliente Android | **Implementado** | `cliente-android/app/.../LoginScreen.kt`, `ClienteApp.kt`, `ClienteViewModel.kt`, `StoresScreen.kt`, `OrdersScreen.kt`, `OrderDetailScreen.kt` | Login `CUSTOMER` obrigatório, lista de estabelecimentos vinculados pelo link, cardápio, carrinho, checkout, histórico de pedidos com comanda e perfil. O APK não carrega mais a loja (`STORE_SLUG` removido). Sem push, mapa de entregador em tempo real, pagamento real ou avaliação. |
| Meus estabelecimentos | **Implementado** | `CustomerStoreController`, `CustomerStoreService`, `CustomerStore`, `StoresScreen.kt` | Vinculados por link; idempotente; limite de 50 lojas por cliente; slug validado no tenant-service (indisponível → 503). |
| Tempo real do vendedor | **Implementado** | `SseOrderEventRegistry`, `GET /api/store/me/orders/stream` | SSE em memória por instância; app Android reconecta com backoff. |
| Tempo real do entregador | **Planejado** | — | Entregador faz polling de 8 s. |
| Mensageria | **Parcial** | `KafkaOrderEventPublisher` | Producer do tópico `order-events`; nenhum consumidor implementado. |
| Cache | **Planejado** | `docker-compose.yml` | Redis provisionado, sem uso. |
| Busca | **Planejado** | — | Listagem direta no banco. |
| Upload de mídia | **Planejado** | — | Imagens são URLs externas. |
| Notificações | **Planejado** | — | Sem push, e-mail ou WhatsApp. |
| Observabilidade | **Parcial** | Actuator | Apenas `health` e `info`. |
| Testes | **Parcial** | `*ApplicationTests` | Apenas `contextLoads()`. |

---

## 6. O que é visão-alvo e não está implementado

O documento [`../arquitetura.md`](../arquitetura.md) descreve uma plataforma significativamente maior. Os itens abaixo são **Planejados** e não devem ser tratados como existentes:

- BFFs separados por aplicação.
- API Gateway reativo com rate limit, versionamento e mTLS.
- Kafka/Redpanda como barramento completo, com Outbox, Saga, idempotência e consumidores.
- `Payment Service`, `Settlement`, `Dispatch`, `Tracking`, `Notification`, `Search` e `Media`.
- WebSocket/MQTT para tempo real e GPS.
- PostgreSQL com PostGIS, Redis GEO, OpenSearch, time-series e S3/CDN.
- Row-Level Security e propagação de `tenant_id` por JWT/header.
- Kubernetes, service mesh, Terraform, GitOps, canary/blue-green.
- Observabilidade com OpenTelemetry, Prometheus, Grafana, Loki, Tempo e Sentry.
- App cliente iOS e publicação nas lojas de aplicativos.
- Split de pagamento, repasses e conciliação financeira.

Esses itens podem orientar o roadmap, mas qualquer afirmação de que já existem é incorreta.

---

## 7. Divergências em relação à documentação existente

| Documento | O que diz | O que o código mostra | Ação |
|---|---|---|---|
| `README.md` | “Spring Boot 3” | Spring Boot **4.1.1** nos POMs. | Corrigir em uma revisão futura do README; a documentação técnica usa a versão real. |
| `README.md` | “Banco em memória H2 configurado por padrão” | PostgreSQL 16 com `ddl-auto: validate` e Liquibase; H2 é dependência sem configuração. | Considerar H2 como **Legado**; subir PostgreSQL via Docker. |
| `README.md` | “Kafka (Redpanda)” e “Pedidos em tempo real” | Redpanda recebe `order-events` do order-service e o SSE entrega ao vendedor; não há consumidor Kafka. | **Implementado parcialmente**: producer + SSE, sem consumidor. |
| `README.md` | “Máquina de estados e Saga do pedido” | `OrderService.updateStatus` aceita qualquer transição; não há Saga. | Tratar como **Planejado**. |
| `docs/arquitetura.md` | Serviços e padrões avançados | Apenas 5 serviços e REST síncrono. | Ler como visão-alvo. |
| `docs/arquitetura.md` | `GET /tenants/{slug}/theme` | O caminho real é `/api/tenants/{slug}/theme`. | Usar o caminho real. |
| Página inicial do frontend | “GMV, comissões de 12%, repasses” | Não há cálculo financeiro no backend. | Tratar como visão de produto. |
| Tela de pagamentos do Android | Envia `config` | Backend lê `enabledMethods`. | Defeito conhecido; ver `03-api.md`. |
| `docs/arquitetura.md` e protótipo | Link público da loja no formato `https://<domínio>/l/<slug>` | O web serve a loja em `/loja/<slug>`; não existe rota `/l/` no frontend. | Divergente: o cadastro de vendedor exibe `/l/` como padrão. Definir o formato canônico antes de divulgar links. |

---

## 8. Premissas e restrições

- O ambiente de desenvolvimento assume que todos os serviços rodam na mesma máquina, com PostgreSQL em Docker.
- O gateway resolve os serviços por `http://localhost:{porta}`; não há descoberta de serviço.
- O `JWT_SECRET` padrão é apenas para desenvolvimento e deve ser substituído.
- A aplicação não usa HTTPS localmente; o app Android permite cleartext no build `debug`.
- Não há separação de ambientes (dev/staging/prod) no repositório.
- O frontend e o Android dependem do gateway em `http://localhost:8080` ou `http://10.0.2.2:8080`.
- O sistema não está pronto para produção sem as ações de [`06-seguranca.md`](06-seguranca.md) e [`05-operacao.md`](05-operacao.md).

---

## 9. Glossário

| Termo | Definição |
|---|---|
| **Tenant / loja** | Unidade de negócio isolada, identificada por `id` (UUID) e `slug` único. |
| **Slug** | Identificador legível usado na URL da loja, por exemplo `pizzaria-do-joao`. |
| **Link do estabelecimento** | `deliveryhub://loja/{slug}` ou `https://.../loja/{slug}`; vincula a loja à conta do cliente e a coloca na lista inicial do app. |
| **Meus estabelecimentos** | Lista das lojas vinculadas à conta do cliente (`customer_stores` no identity-service). |
| **Tema** | Conjunto de dados visuais da loja: logo, banner, cores e dados de entrega. |
| **Dish / prato** | Item de catálogo com nome, categoria, preço, disponibilidade e esforço de cozinha por unidade. |
| **Esforço de cozinha** | Minutos de produção por unidade de um prato (`effortMinutes`); o pedido reserva `Σ esforço × quantidade`. |
| **Janela de produção** | Intervalo de venda do prato (`11:00-15:00`, por exemplo) usado também para encaixar pedidos. |
| **Agenda pública** | Lista sanitizada dos pedidos de um dia, na ordem de execução, disponível ao cliente. |
| **Pedido** | Registro de compra com itens, cliente, endereço, pagamento, taxa e status. |
| **`origin`** | Origem do pedido: `APP` (feito pelo cliente) ou `COUNTER` (balcão). |
| **Pedido de balcão** | Pedido criado pelo vendedor, sem taxa de entrega e já em `PREPARING`. |
| **Courier / entregador** | Conta com papel `COURIER` e/ou registro na tabela `couriers` da loja. |
| **Store** | Prefixo `/api/store/**`, usado pelas telas do vendedor. |
| **Gateway** | Ponto de entrada HTTP único na porta `8080`. |
| **Seed** | Carga inicial de dados de demonstração. |
| **Demo data** | Dados fictícios ativados por `app.seed.demo-data=true` em identity, tenant e catalog. |
| **JWT** | Token assinado com HS256, emitido pelo identity e validado pelo gateway e pelo identity. |
| **Liquibase** | Ferramenta de migração versionada; cada serviço tem seu changelog. |
| **Database-per-service** | Cada serviço possui seu próprio banco lógico, sem joins entre domínios. |
| **As-is** | Comportamento implementado e observável no código atual. |
| **To-be** | Visão-alvo descrita em `docs/arquitetura.md`. |

---

## 10. Referências internas

- Arquitetura atual: [`02-arquitetura.md`](02-arquitetura.md)
- API: [`03-api.md`](03-api.md)
- Dados: [`04-dados.md`](04-dados.md)
- Operação: [`05-operacao.md`](05-operacao.md)
- Segurança: [`06-seguranca.md`](06-seguranca.md)
- Qualidade e testes: [`07-qualidade-e-testes.md`](07-qualidade-e-testes.md)
- Desenvolvimento: [`08-desenvolvimento.md`](08-desenvolvimento.md)
- Decisões: [`09-decisoes/README.md`](09-decisoes/README.md)
- Visão-alvo histórica: [`../arquitetura.md`](../arquitetura.md)
