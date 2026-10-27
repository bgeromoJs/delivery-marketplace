# 03 — API HTTP

| Campo | Valor |
|---|---|
| Status | Implementado, com lacunas de contrato e autorização |
| Público | Desenvolvedores de frontend, mobile, integrações e QA |
| Última revisão | 2026-10-26 |
| Fonte de verdade | Controllers, DTOs, configurações de segurança e respostas observáveis |
| Especificação gerada | OpenAPI via springdoc em cada serviço |

> Esta é uma referência **as-is**. Onde o comportamento é frágil ou divergente, a lacuna é marcada explicitamente. O contrato recomendado para evolução está na seção [10](#10-contrato-de-erro-recomendado).

---

## 1. Convenções gerais

| Item | Convenção |
|---|---|
| URL base local | `http://localhost:8080` (gateway) |
| Prefixo | `/api` |
| Formato | JSON UTF-8 |
| Campos | `camelCase` |
| Identificadores | UUID em string |
| Dinheiro | Número decimal (`BigDecimal`), sem formatação monetária |
| Data/hora | ISO-8601 sem fuso explícito (`LocalDateTime`) |
| Autenticação | `Authorization: Bearer <JWT>` |
| Versão | Não há versionamento de API |
| Paginação | Não implementada |
| Idempotência | Não implementada |
| Rate limit | Não implementado |

### 1.1 URL base por cliente

| Cliente | URL |
|---|---|
| Web | `NEXT_PUBLIC_API_URL` ou `http://localhost:8080` |
| Android debug | `http://10.0.2.2:8080/api/` |
| Android release | `https://api.seudominio.com/api/` (placeholder) |
| Serviços diretos | `http://localhost:8081` a `8084` (não recomendado para clientes) |

### 1.2 Swagger e OpenAPI

| Serviço | Swagger UI | OpenAPI |
|---|---|---|
| Gateway (agregado) | `http://localhost:8080/swagger-ui.html` | Seleção por definição |
| identity | `http://localhost:8081/swagger-ui.html` | `http://localhost:8081/v3/api-docs` |
| tenant | `http://localhost:8082/swagger-ui.html` | `http://localhost:8082/v3/api-docs` |
| catalog | `http://localhost:8083/swagger-ui.html` | `http://localhost:8083/v3/api-docs` |
| order | `http://localhost:8084/swagger-ui.html` | `http://localhost:8084/v3/api-docs` |

O gateway expõe `/v3/api-docs/{identity|tenant|catalog|order}` e reescreve para `/v3/api-docs` do serviço correspondente. O Swagger agregado usa o seletor **Select a definition**.

> A especificação gerada é útil para exploração, mas não cobre todos os erros, não descreve segurança em todos os serviços e não é validada por lint no CI.

---

## 2. Autenticação

### 2.1 Login

```http
POST /api/auth/login
Content-Type: application/json
```

```json
{
  "email": "admin@delivery.com",
  "password": "admin123"
}
```

Resposta `200 OK`:

```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "tokenType": "Bearer",
  "user": {
    "id": "00000000-0000-0000-0000-000000000000",
    "name": "Administrador da Plataforma",
    "email": "admin@delivery.com",
    "phone": "+5511999990000",
    "role": "ADMIN",
    "tenantId": null,
    "active": true,
    "createdAt": "2026-10-23T02:45:43.976831"
  }
}
```

- Token HS256, emissor `deliveryhub-identity`, validade de **60 minutos**.
- Claims: `sub`, `email`, `role`, `iss`, `iat`, `exp`.
- Não há refresh token, revogação ou logout no servidor.
- Credenciais inválidas retornam **401**; conta com `active=false` retorna **403**.
- Desativar uma conta não invalida tokens já emitidos; eles seguem válidos até expirar (60 min).

### 2.2 Uso do token

```http
GET /api/auth/users
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
```

### 2.3 Matriz de autorização via gateway

| Grupo de rotas | Anônimo | ADMIN | SUPPORT | SELLER | COURIER | CUSTOMER |
|---|---:|---:|---:|---:|---:|---:|
| `POST /api/auth/login` | Sim | Sim | Sim | Sim | Sim | Sim |
| `POST /api/auth/register` | Sim | Sim | Sim | Sim | Sim | Sim |
| `POST /api/auth/password/*` | Sim | Sim | Sim | Sim | Sim | Sim |
| `GET /api/auth/users/**` | Não | Sim | Sim | Não | Não | Não |
| `POST/PUT/PATCH /api/auth/users/**` | Não | Sim | Não | Não | Não | Não |
| `/api/auth/admin/**` | Não | Sim | Não | Não | Não | Não |
| `GET /api/tenants/**` | Sim | Sim | Sim | Sim | Sim | Sim |
| `POST/PUT/PATCH /api/tenants/**` | Não | Sim | Não | Não | Não | Não |
| `/api/catalog/**` | Sim | Sim | Sim | Sim | Sim | Sim |
| `/api/orders/**` | Sim | Sim | Sim | Sim | Sim | Sim |
| `/api/store/**` | Sim | Sim | Sim | Sim | Sim | Sim |

> A matriz reflete o **gateway**. Chamadas diretas às portas `8082`, `8083` e `8084` não passam por essas regras; somente identity e gateway têm Spring Security. Ver [`06-seguranca.md`](06-seguranca.md).

---

## 3. Identity Service

Base: `/api/auth` — porta `8081`.

### 3.1 Endpoints

| Método | Caminho | Auth | Sucesso | Erros relevantes |
|---|---|---|---|---|
| `POST` | `/login` | Público | `200` `AuthResponse` | `400` validação; `401` credenciais inválidas; `403` conta desativada |
| `POST` | `/register` | Público | `200` `AuthResponse` | `400` validação; `403` perfil diferente de CUSTOMER; `409` e-mail existente |
| `POST` | `/password/forgot` | Público | `200` mensagem genérica | `400` validação; `503` SMS não configurado/falha |
| `POST` | `/password/reset` | Público | `204` sem corpo | `400` código inválido/expirado |
| `GET` | `/users` | ADMIN ou SUPPORT | `200` lista de `UserDto` | `401`/`403` |
| `GET` | `/users/{id}` | ADMIN ou SUPPORT | `200` `UserDto` | `404` não encontrado |
| `PUT` | `/users/{id}` | ADMIN | `200` `UserDto` | `400` validação; `409` e-mail duplicado |
| `POST` | `/admin/users` | ADMIN | `200` `UserDto` | `400` perfil/loja/senha; `409` e-mail existente |
| `PUT` | `/admin/users/{id}` | ADMIN | `200` `UserDto` | `400` validação; `404`; `409` e-mail duplicado ou proteção do último admin |
| `PATCH` | `/admin/users/{id}/status` | ADMIN | `200` `UserDto` | `404`; `409` auto-desativação ou último admin |
| `POST` | `/admin/team` | ADMIN | `200` `UserDto` | `400` role inválida; `409` e-mail existente |
| `POST` | `/admin/users/{id}/seller-link` | ADMIN | `200` `UserDto` | `404`; `409` conflito |
| `GET` | `/admin/settings` | ADMIN | `200` `PlatformSettingsDto` | `401`/`403` |
| `PUT` | `/admin/settings` | ADMIN | `200` `PlatformSettingsDto` | `400` validação |
| `GET` | `/admin/audit` | ADMIN | `200` últimos 100 eventos | `401`/`403` |
| `POST` | `/admin/audit` | ADMIN | `200` `AuditEntryDto` | `400` validação |

### 3.2 Registro

```json
{
  "name": "Maria Cliente",
  "email": "maria@exemplo.com",
  "password": "senha-forte",
  "phone": "+5511999990004",
  "role": "CUSTOMER",
  "tenantId": null
}
```

- `role` aceita apenas `CUSTOMER` no cadastro público; qualquer outro perfil retorna `403`.
- `tenantId` é ignorado e gravado como `null`. Vínculo com loja, quando necessário, é definido pelo painel.
- A senha não tem política mínima no cadastro público (apenas `@NotBlank`); a senha inicial criada pelo painel exige 8 caracteres.
- Não há verificação de e-mail.
- Credenciais inválidas retornam `401`; conta inativa retorna `403`.

### 3.3 Recuperação de senha

```json
{
  "phone": "+5511999990000"
}
```

A resposta é sempre genérica para não revelar se a conta existe:

```json
{
  "message": "Se a conta existir e tiver celular cadastrado, enviaremos um código por SMS."
}
```

Reset:

```json
{
  "phone": "+5511999990000",
  "code": "12345678",
  "password": "nova-senha-com-8+"
}
```

Regras: código de 8 dígitos, HMAC-SHA256, validade de 10 minutos, 5 tentativas, intervalo de 60 segundos entre envios. Somente contas `ADMIN` são elegíveis. Requer Twilio configurado.

### 3.4 Usuários e equipe

Todo usuário retornado por `/api/auth/users` tem o formato:

```json
{
  "id": "3f1c9a52-8f0e-4a3d-9b1e-2c7d5e6f8a90",
  "name": "João da Silva",
  "email": "joao@pizzaria.com",
  "phone": "(11) 99999-0002",
  "role": "SELLER",
  "tenantId": "398935eb-36c3-4574-acbc-3b37a6cefa61",
  "active": true,
  "createdAt": "2026-10-23T01:02:03.533125"
}
```

Perfis (`role`):

| Valor | Uso | `tenantId` |
|---|---|---|
| `ADMIN` | Administrador do sistema; acesso total ao painel e à gestão de usuários | Proibido |
| `SUPPORT` | Analista de suporte; acesso operacional ao painel, leitura de usuários | Proibido |
| `SELLER` | Vendedor/loja | **Obrigatório** |
| `COURIER` | Entregador | Opcional |
| `CUSTOMER` | Cliente | Opcional (o cadastro público grava `null`) |

`POST /api/auth/admin/users` (ADMIN) — cria o usuário, sem devolver token:

```json
{
  "name": "Maria Cliente",
  "email": "maria@exemplo.com",
  "phone": "11999990004",
  "password": "senha-inicial-8+",
  "role": "CUSTOMER",
  "tenantId": null,
  "active": true
}
```

- `password` é obrigatório na criação e deve ter pelo menos 8 caracteres.
- `active` ausente equivale a `true`.
- `ADMIN`/`SUPPORT` com `tenantId` retornam `400`; `SELLER` sem `tenantId` retorna `400`.
- E-mail duplicado retorna `409`.
- O identity **não** valida se o `tenantId` existe no tenant-service.

`PUT /api/auth/admin/users/{id}` (ADMIN) — mesmos campos da criação; `password` em branco mantém a senha atual:

```json
{
  "name": "Maria Cliente",
  "email": "maria@exemplo.com",
  "phone": "11999990004",
  "role": "CUSTOMER",
  "tenantId": null,
  "active": true,
  "password": "nova-senha-8+"
}
```

`PATCH /api/auth/admin/users/{id}/status` (ADMIN):

```json
{ "active": false }
```

Regras de proteção:

- a última conta `ADMIN` ativa não pode ser desativada, rebaixada ou removida do perfil;
- o administrador logado não pode desativar nem rebaixar a própria conta;
- conta desativada continua no banco, mas o login retorna `403`;
- criar, editar e mudar situação registram auditoria (`USUARIO_CRIADO`, `USUARIO_ATUALIZADO`, `USUARIO_ATIVADO`/`USUARIO_DESATIVADO`).

`PUT /api/auth/users/{id}` (ADMIN) — edição de perfil básico, usada em “Minha conta”:

```json
{
  "name": "Novo Nome",
  "email": "novo@exemplo.com",
  "phone": "11999990000"
}
```

Não altera senha, papel, `tenantId` nem situação.

`POST /api/auth/admin/team` (ADMIN) — atalho legado para criar um `ADMIN`:

```json
{
  "name": "Admin Secundário",
  "email": "admin2@exemplo.com",
  "password": "senha-forte",
  "phone": "11999990001",
  "role": "ADMIN"
}
```

`POST /api/auth/admin/users/{id}/seller-link` (ADMIN):

```json
{
  "tenantId": "11111111-1111-1111-1111-111111111111"
}
```

### 3.5 Configurações da plataforma

`GET`/`PUT /api/auth/admin/settings`:

```json
{
  "paymentProposalValidityHours": 24,
  "orderWithoutCourierAlertMinutes": 12,
  "storeLinkDomain": "deliveryhub.com.br"
}
```

- `paymentProposalValidityHours` e `orderWithoutCourierAlertMinutes` devem ser `>= 1`.
- `storeLinkDomain` não pode ser vazio.
- Na primeira leitura, os valores padrão são persistidos.
- O `PUT` registra auditoria `CONFIGURACOES_ATUALIZADAS`.

### 3.6 Auditoria

`POST /api/auth/admin/audit`:

```json
{
  "action": "CONFIGURACOES_ATUALIZADAS",
  "target": "Regras da plataforma",
  "description": "Ajuste do tempo de alerta"
}
```

- `action` máximo 80 caracteres; `target` máximo 180; `description` máximo 500.
- O ator vem do JWT (`sub`, `email`), nunca do corpo.
- `GET` retorna os 100 eventos mais recentes.

---

## 4. Tenant Service

Base: `/api/tenants` — porta `8082`.

### 4.1 Endpoints

| Método | Caminho | Auth via gateway | Sucesso | Observação |
|---|---|---|---|---|
| `GET` | `/api/tenants?all=false` | Público | `200` lista | Sem `all`, só `ACTIVE`. |
| `GET` | `/api/tenants?all=true` | Público | `200` lista | Inclui `PENDING`/`SUSPENDED`. |
| `GET` | `/api/tenants/{slug}` | Público | `200` `Tenant` | `500` se não encontrado. |
| `GET` | `/api/tenants/id/{id}` | Público | `200` `Tenant` | `500` se não encontrado. |
| `GET` | `/api/tenants/{slug}/theme` | Público | `200` `ThemeDto` | `500` se não encontrado. |
| `POST` | `/api/tenants` | ADMIN | `200` `Tenant` | `500` slug duplicado. |
| `PUT` | `/api/tenants/{id}` | ADMIN | `200` `Tenant` | `500` não encontrado/slug duplicado. |
| `PATCH` | `/api/tenants/{id}/status` | ADMIN | `200` `Tenant` | Status livre; default `ACTIVE`. |

### 4.2 Campos do tenant

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| `id` | UUID | Gerado | `@PrePersist` |
| `name` | string | Sim | — |
| `slug` | string | Sim | Único, minúsculo, sem espaços nas pontas |
| `description` | string | Não | — |
| `logoUrl` / `bannerUrl` | string | Não | URL externa |
| `primaryColor` / `secondaryColor` | string | Não | Defaults `#E11D48` / `#F43F5E` |
| `deliveryFee` | decimal | Não | Default `6.90` |
| `deliveryTimeMin` | integer | Não | Default `40` |
| `vendorAcceptTimeoutMinutes` | integer | Não | Default `10`, mínimo `1` |
| `deliveryRadiusKm` | decimal | Não | Default `5.00`, mínimo `0.1` |
| `status` | string | Não | `ACTIVE`, `PENDING`, `SUSPENDED` na prática |
| `address`, `phone` | string | Não | — |
| `legalName`, `document` | string | Não | — |
| `city`, `state` | string | Não | — |
| `ownerName`, `ownerEmail`, `ownerPhone` | string | Não | — |
| `rating` | decimal | Não | Default `4.8` |
| `createdAt` | datetime | Gerado | — |

### 4.3 Criar loja

```json
{
  "name": "Pizzaria do João",
  "slug": "pizzaria-do-joao",
  "description": "Pizzas artesanais",
  "deliveryFee": 6.9,
  "deliveryTimeMin": 35,
  "vendorAcceptTimeoutMinutes": 10,
  "deliveryRadiusKm": 5.0,
  "status": "PENDING",
  "address": "Rua das Flores, 120",
  "phone": "(11) 3456-7890",
  "ownerName": "João da Silva",
  "ownerEmail": "joao@exemplo.com"
}
```

### 4.4 Tema

`GET /api/tenants/{slug}/theme` retorna:

```json
{
  "tenantId": "11111111-1111-1111-1111-111111111111",
  "name": "Pizzaria do João",
  "slug": "pizzaria-do-joao",
  "logoUrl": "https://...",
  "bannerUrl": "https://...",
  "primaryColor": "#E11D48",
  "secondaryColor": "#BE123C",
  "deliveryFee": 6.90,
  "deliveryTimeMin": 35,
  "vendorAcceptTimeoutMinutes": 10,
  "deliveryRadiusKm": 5.00,
  "address": "Rua das Flores, 120 - Centro",
  "phone": "(11) 3456-7890",
  "rating": 4.9
}
```

---

## 5. Catalog Service

Base pública: `/api/catalog` — porta `8083`.

### 5.1 Endpoints públicos

| Método | Caminho | Auth | Sucesso | Observação |
|---|---|---|---|---|
| `GET` | `/api/catalog/tenants/{tenantId}/dishes?availableOnly=false` | Público | `200` lista de `Dish` | `availableOnly=true` filtra disponíveis. |
| `GET` | `/api/catalog/tenants/{tenantId}/categories` | Público | `200` lista de strings | Categorias distintas. |
| `GET` | `/api/catalog/dishes/{id}` | Público | `200` `Dish` | `500` se não encontrado. |
| `POST` | `/api/catalog/dishes` | Público | `200` `Dish` | **Escrita pública.** |
| `PATCH` | `/api/catalog/dishes/{id}/availability` | Público | `200` `Dish` | Body `{ "available": true }`. |
| `PUT` | `/api/catalog/dishes/{id}` | Público | `200` `Dish` | **Escrita pública.** |
| `PATCH` | `/api/catalog/dishes/{id}` | Público | `200` `Dish` | **Escrita pública.** |

### 5.2 Campos do prato

| Campo | Tipo | Observação |
|---|---|---|
| `id` | UUID | Gerado |
| `tenantId` | UUID | Obrigatório |
| `name` | string | Obrigatório |
| `description` | string | Até 1000 caracteres |
| `price` | decimal | Obrigatório |
| `category` | string | Obrigatório |
| `imageUrl` | string | URL externa |
| `available` | boolean | Default `true` |
| `optionsJson` | string | JSON serializado como texto |
| `salesDaysJson` | string | Ex.: `[1,2,3,4,5]` |
| `salesWindowsJson` | string | Ex.: `["11:00-15:00","18:00-23:00"]` |
| `preparationTimeMin` | integer | Default `25` (informativo; não entra na agenda) |
| `effortMinutes` | integer | **Implementado.** Esforço de cozinha por unidade, em minutos; default `20`, limitado a `1440`. |
| `createdAt` | datetime | Gerado |

### 5.3 Cardápio do vendedor

Base: `/api/store/me/dishes` — porta `8083`.

| Método | Caminho | Auth | Sucesso | Observação |
|---|---|---|---|---|
| `GET` | `/api/store/me/dishes` | Público | `200` lista | **Todos os pratos**, sem filtro por loja. |
| `POST` | `/api/store/me/dishes` | Público | `200` DTO | Resolve a loja atual. |
| `PUT` | `/api/store/me/dishes/{id}` | Público | `200` DTO | Atualização parcial. |
| `PUT` | `/api/store/me/dishes/{id}/toggle` | Público | `200` DTO | Inverte `available`. |

Corpo de criação/atualização (`DishRequest`):

```json
{
  "name": "Pizza Margherita",
  "category": "Pizzas Salgadas",
  "price": 58.0,
  "active": true,
  "description": "Molho rústico e manjericão",
  "imageUrl": "https://...",
  "optionsJson": "[{\"name\":\"Bacon extra\",\"price\":5.0}]",
  "salesDaysJson": "[1,2,3,4,5,6]",
  "salesWindowsJson": "[\"11:00-15:00\",\"18:00-23:00\"]",
  "effortMinutes": 20
}
```

Resposta do store:

```json
{
  "id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  "name": "Pizza Margherita",
  "category": "Pizzas Salgadas",
  "price": 58.0,
  "active": true,
  "unavailableNote": null,
  "days": [1, 2, 3, 4, 5, 6],
  "windows": ["11:00-15:00", "18:00-23:00"],
  "imageUrl": "https://...",
  "description": "Molho rústico e manjericão",
  "optionsJson": "...",
  "salesDaysJson": "[1,2,3,4,5,6]",
  "salesWindowsJson": "[\"11:00-15:00\"]",
  "effortMinutes": 20
}
```

Se `salesDaysJson`/`salesWindowsJson` estiverem vazios ou inválidos, o serviço aplica fallbacks (`[1..6]` e dois horários). O parser é manual (remove colchetes e aspas), não é um parser JSON robusto.

`effortMinutes` é normalizado no store: nulo ou negativo vira `20`; valores acima de `1440` são limitados a `1440`. A atualização (`PUT`) só altera o esforço quando o campo é enviado.

---

## 6. Order Service

Base: `/api/orders` — porta `8084`.

### 6.1 Endpoints

| Método | Caminho | Auth | Sucesso | Observação |
|---|---|---|---|---|
| `POST` | `/api/orders` | Público | `200` `Order` | Nasce `PAID`; pagamento simulado; reserva a agenda de produção. |
| `POST` | `/api/orders/availability` | Público | `200` `Availability` | Janelas e melhor encaixe para os itens do carrinho. |
| `GET` | `/api/orders/{id}` | Público | `200` `Order` | `500` se não encontrado. |
| `GET` | `/api/orders/tenant/{tenantId}` | Público | `200` lista | Ordenado por `createdAt` desc. Expõe PII. |
| `GET` | `/api/orders/tenant/{tenantId}/agenda?date=AAAA-MM-DD` | Público | `200` lista sanitizada | Agenda pública do dia, na ordem de execução. |
| `GET` | `/api/orders/courier/{courierId}` | Público | `200` lista | — |
| `GET` | `/api/orders/available-deliveries` | Público | `200` lista | `READY` e `courierId` nulo. |
| `GET` | `/api/orders` | Público | `200` lista | **Todos os pedidos.** |
| `PATCH` | `/api/orders/{id}/status` | Público | `200` `Order` | Status e courier livres. |

### 6.2 Criar pedido

```json
{
  "tenantId": "11111111-1111-1111-1111-111111111111",
  "customerId": null,
  "customerName": "Maria Souza",
  "customerPhone": "(11) 98888-1234",
  "deliveryAddress": "Rua das Acácias, 210 - Centro",
  "paymentMethod": "PIX",
  "notes": "sem cebola",
  "deliveryFee": 6.0,
  "scheduledDate": "2026-10-26",
  "scheduledWindow": "18:00-23:00",
  "items": [
    {
      "dishId": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      "dishName": "Lasanha bolonhesa",
      "quantity": 2,
      "unitPrice": 34.9,
      "optionsJson": "[{\"name\":\"Bacon extra\",\"price\":5.0}]",
      "effortMinutes": 20
    }
  ]
}
```

Regras atuais:

- `tenantId`, `customerName`, `deliveryAddress`, `paymentMethod` e `items` são obrigatórios.
- `items` não pode ser vazio.
- `paymentMethod` é convertido para maiúsculas.
- `deliveryFee` ausente vira `7.00`.
- `subtotal` é calculado como soma de `unitPrice * quantity`.
- `totalAmount = subtotal + deliveryFee`.
- `status = PAID`.
- `origin = APP` por default.
- O número do pedido é gerado com 4 dígitos aleatórios; há até 50 tentativas e fallback para os últimos dígitos do timestamp.
- `scheduledDate` e `scheduledWindow` são opcionais. Sem eles, o pedido entra na primeira janela com capacidade; com eles, o `409` é retornado se não couber.
- `effortMinutes` do item é apenas fallback quando o catálogo está indisponível; o valor atual do catálogo prevalece.
- A criação reserva a agenda e grava `reservedEffortMinutes`, `scheduledStart`, `scheduledEnd` e `scheduledWindow`.
- Não há validação de existência do tenant, do prato, do preço ou da disponibilidade.
- Não há idempotência.

Resposta (resumida):

```json
{
  "id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  "orderNumber": "4822",
  "tenantId": "11111111-1111-1111-1111-111111111111",
  "customerId": null,
  "customerName": "Maria Souza",
  "customerPhone": "(11) 98888-1234",
  "courierId": null,
  "status": "PAID",
  "origin": "APP",
  "subtotal": 69.8,
  "deliveryFee": 6.0,
  "totalAmount": 75.8,
  "deliveryAddress": "Rua das Acácias, 210 - Centro",
  "paymentMethod": "PIX",
  "notes": "sem cebola",
  "items": [
    {
      "id": "cccccccc-cccc-cccc-cccc-cccccccccccc",
      "dishId": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      "dishName": "Lasanha bolonhesa",
      "quantity": 2,
      "unitPrice": 34.9,
      "totalPrice": 69.8,
      "optionsJson": "[{\"name\":\"Bacon extra\",\"price\":5.0}]",
      "effortMinutes": 20
    }
  ],
  "createdAt": "2026-10-26T12:00:00",
  "updatedAt": "2026-10-26T12:00:00",
  "preparingAt": null,
  "reservedEffortMinutes": 40,
  "scheduledStart": "2026-10-26T18:00:00",
  "scheduledEnd": "2026-10-26T18:40:00",
  "scheduledWindow": "18:00-23:00"
}
```

### 6.3 Disponibilidade e agenda de produção

Os itens informados passam pelo `SchedulingService`, que calcula o esforço total, as janelas comuns aos pratos e a carga ativa da cozinha.

#### Consultar disponibilidade

```http
POST /api/orders/availability
Content-Type: application/json
```

```json
{
  "tenantId": "11111111-1111-1111-1111-111111111111",
  "items": [
    { "dishId": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "quantity": 2, "effortMinutes": 20 }
  ]
}
```

```json
{
  "effortMinutes": 40,
  "windows": [
    {
      "date": "2026-10-26",
      "window": "18:00-23:00",
      "start": "2026-10-26T18:00:00",
      "end": "2026-10-26T23:00:00",
      "availableStart": "2026-10-26T18:40:00",
      "availableEnd": "2026-10-26T19:20:00",
      "remainingMinutes": 260,
      "available": true,
      "recommended": true
    }
  ]
}
```

- A consulta lista as janelas de hoje até `app.scheduling.max-days-ahead` dias à frente (default `7`).
- `availableStart`/`availableEnd` são o primeiro encaixe; `remainingMinutes` considera os intervalos já ocupados.
- Apenas a primeira janela disponível recebe `recommended = true`.
- `400` se `tenantId` ou `items` faltarem; `409` se não existir janela comum aos itens.

#### Agenda pública do dia

```http
GET /api/orders/tenant/{tenantId}/agenda?date=2026-10-26
```

```json
[
  {
    "position": 1,
    "number": "4822",
    "status": "PREPARING",
    "origin": "APP",
    "window": "18:00-23:00",
    "start": "2026-10-26T18:00:00",
    "end": "2026-10-26T18:40:00",
    "effortMinutes": 40,
    "items": [
      { "name": "Batata frita", "qty": 2 }
    ]
  }
]
```

- `date` é opcional no formato ISO (`AAAA-MM-DD`); sem ele, o serviço usa o dia atual.
- Inclui pedidos não `CANCELLED` cujo intervalo de produção toca o dia consultado.
- A ordem é a de execução: `scheduledStart`, depois `preparingAt`, depois `createdAt`; `position` começa em `1`.
- O payload é **sanitizado**: não expõe nome, telefone, endereço nem valores. O cliente reconhece o próprio pedido pelo `number`.
- O app vendedor Android consome este mesmo endpoint na aba Agenda (`ui/agenda/AgendaScreen.kt`): seletor de dia, resumo de pedidos/cozinha/esforço, lista na ordem de execução, pull-to-refresh e polling de 30 s. O app não usa SSE para a agenda.
- Não há autenticação nem paginação. Ver risco de enumeração em [`06-seguranca.md`](06-seguranca.md#43-lacunas-de-autorização).

#### Regras de encaixe

- Esforço total = `Σ (effortMinutes do prato × quantidade)`; o catálogo prevalece sobre o `effortMinutes` enviado no request. Sem catálogo e sem request, usa `app.scheduling.default-effort-minutes` (default `20`).
- Cada prato contribui com seus dias (`salesDaysJson`) e janelas (`salesWindowsJson`); o pedido só cabe na interseção de todos os itens. Sem configuração válida, o fallback é segunda a sábado (`1..6`) com `11:00-15:00` e `18:00-23:00`.
- Ocupam a agenda os pedidos `PAID`, `ACCEPTED` e `PREPARING`. `CANCELLED`, `READY`, `PICKED_UP` e `DELIVERED` liberam o intervalo.
- Sem `scheduledDate`, o pedido procura a primeira janela com espaço nos próximos dias, considerando a carga em andamento.
- Com `scheduledDate` ou `scheduledWindow`, o serviço valida a escolha e retorna `409` quando não há capacidade.
- O pedido de balcão usa `planImmediate`: começa depois da carga que já está em produção, sem esperar a próxima janela de venda.

### 6.4 Atualizar status

```http
PATCH /api/orders/{id}/status
Content-Type: application/json
```

```json
{
  "status": "READY",
  "courierId": "dddddddd-dddd-dddd-dddd-dddddddddddd"
}
```

- `status` é convertido com `OrderStatus.valueOf(status.toUpperCase())`.
- `status` ausente/inválido → `NullPointerException`/`IllegalArgumentException` → **500**.
- `courierId` inválido → `IllegalArgumentException` → **500**.
- Qualquer transição é aceita, inclusive voltar de `DELIVERED` para `PAID`.
- `courierId` é opcional; quando presente, é gravado.
- A resposta é a entidade `Order` atualizada, incluindo `preparingAt`.
- `preparingAt` é preenchido no primeiro `ACCEPTED`/`PREPARING` (ou na criação de pedido de balcão) e **não** é sobrescrito depois; é a chave da prioridade FIFO do preparo.

### 6.5 Fila e ações do vendedor

Base: `/api/store/me/orders` — porta `8084`.

| Método | Caminho | Auth | Sucesso | Observação |
|---|---|---|---|---|
| `GET` | `/api/store/me/orders` | Público | `200` lista | Todos os pedidos não `CANCELLED`, de todas as lojas. Ordenados por status (novos, preparo, prontos); no preparo, FIFO por `preparingAt`. |
| `POST` | `/api/store/me/orders/counter` | Público | `200` DTO | Pedido de balcão. |
| `POST` | `/api/store/me/orders/{number}/accept` | Público | `200` DTO | Busca por `orderNumber` ou UUID. |
| `POST` | `/api/store/me/orders/{number}/ready` | Público | `200` DTO | — |
| `POST` | `/api/store/me/orders/{number}/reject` | Público | `200` vazio | Define `CANCELLED`. |
| `GET` | `/api/store/me/orders/stream` | Público | `200` `text/event-stream` | SSE; conexão mantida aberta. |

Pedido de balcão:

```json
{
  "tenantId": "11111111-1111-1111-1111-111111111111",
  "customerName": "Cliente do balcão",
  "paymentMethod": "CASH",
  "notes": "sem cebola",
  "items": [
    {
      "dishId": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      "dishName": "Pizza Calabresa",
      "quantity": 1,
      "unitPrice": 54.9,
      "effortMinutes": 20
    }
  ]
}
```

- Sem `tenantId`, resolve a primeira loja ativa.
- Sem `customerName`, usa `Cliente do balcão`.
- Sem `paymentMethod`, usa `CASH`.
- `deliveryFee = 0`, `origin = COUNTER`, `status = PREPARING`.
- `quantity` inválida vira `1`; `unitPrice` nulo vira `0`.
- A agenda usa `planImmediate`: o início é o fim da carga que já está em produção, sem esperar janela de venda.

Resposta da fila (DTO mobile):

```json
[
  {
    "number": "4822",
    "status": "NEW",
    "origin": "APP",
    "items": [
      { "qty": 2, "name": "Lasanha bolonhesa", "price": 34.9 }
    ],
    "note": "sem cebola",
    "total": 75.8,
    "payment": "Pix",
    "paid": true,
    "fee": 6.0,
    "distanceKm": 1.7,
    "secondsToAccept": 280,
    "preparingAt": null,
    "scheduledWindow": "18:00-23:00",
    "scheduledStart": "2026-10-26T18:00:00",
    "scheduledEnd": "2026-10-26T18:40:00",
    "effortMinutes": 40
  }
]
```

`preparingAt` é o instante (ISO-8601 local, sem offset) em que o pedido entrou na fila de preparo. Fica `null` enquanto o pedido está em `NEW`; é preenchido no aceite e permanece o mesmo nas transições seguintes. A fila de preparo é **FIFO por esse campo**: quem entrou antes fica na frente e um pedido recém-aceito vai para o fim.

`scheduledWindow`, `scheduledStart`, `scheduledEnd` e `effortMinutes` refletem a reserva feita na criação. Pedidos antigos ou criados sem catálogo podem ter os campos nulos; nesse caso o vendedor deve tratar a agenda como desconhecida.

Mapeamento de status para o app:

| Status interno | Status no DTO |
|---|---|
| `CREATED`, `PAID` | `NEW` |
| `ACCEPTED`, `PREPARING` | `PREPARING` |
| `READY`, `PICKED_UP`, `DELIVERED`, `CANCELLED` | `READY` |

> `DELIVERED` aparece como `READY` no app. `CANCELLED` é filtrado da listagem. `distanceKm` é **simulado** por hash do ID; `secondsToAccept` parte de 300 s.

#### Canal de tempo real (SSE)

`GET /api/store/me/orders/stream` abre uma conexão `text/event-stream` e envia:

| Evento | Quando | Dados |
|---|---|---|
| `connected` | Ao conectar | `{ "tenantId": "..." }` |
| `ORDER_CREATED` | Pedido criado (app ou balcão) | `OrderEvent` |
| `ORDER_UPDATED` | Aceito, em preparo ou pronto | `OrderEvent` |
| `ORDER_CANCELLED` | Recusado ou cancelado | `OrderEvent` |

Formato do evento:

```text
event: ORDER_CREATED
id: 2026-10-26T03:35:30.217818700Z
data: {"type":"ORDER_CREATED","tenantId":"11111111-1111-1111-1111-111111111111","order":{...},"occurredAt":"2026-10-26T03:35:30.217818700Z"}

```

- O canal é mantido aberto sem timeout e recebe comentários `keep-alive` a cada 20 s.
- O filtro por loja compara o `tenantId` do evento com o da conexão. Se qualquer um for nulo, o evento é entregue a todos.
- Não há autenticação; a loja é resolvida pela primeira ativa.
- Não há replay: ao reconectar, o cliente deve recarregar `GET /api/store/me/orders`.

O mesmo evento é publicado no tópico Kafka `order-events` (chave = `tenantId`). Detalhes em [`../tempo-real-pedidos.md`](../tempo-real-pedidos.md) e [`09-decisoes/0008-eventos-de-pedido-com-sse-e-kafka.md`](09-decisoes/0008-eventos-de-pedido-com-sse-e-kafka.md).

---

## 7. Store Service (tenant)

Base: `/api/store` — porta `8082`.

| Método | Caminho | Auth | Sucesso | Observação |
|---|---|---|---|---|
| `GET` | `/api/store/me` | Público | `200` objeto | Primeira loja ativa; campos resumidos. |
| `GET` | `/api/store/me/payments` | Público | `200` objeto | Métodos em memória. |
| `PUT` | `/api/store/me/payments` | Público | `200` objeto | Lê `enabledMethods`; não persiste. |
| `POST` | `/api/store/me/payments/proposals/pending/confirm` | Público | `200` objeto | No-op. |
| `POST` | `/api/store/me/payments/proposals/pending/reject` | Público | `200` objeto | No-op. |
| `GET` | `/api/store/me/couriers` | Público | `200` lista | Entregadores da primeira loja ativa. |

`GET /api/store/me`:

```json
{
  "id": "11111111-1111-1111-1111-111111111111",
  "name": "Pizzaria do João",
  "slug": "pizzaria-do-joao",
  "status": "ACTIVE",
  "phone": "(11) 3456-7890",
  "deliveryFee": 6.9,
  "deliveryRadiusKm": 5.0,
  "acceptedPaymentMethods": ["PIX", "CARD_ONLINE"]
}
```

`GET /api/store/me/payments`:

```json
{
  "enabledMethods": ["PIX", "CARD_ONLINE"],
  "current": { "enabledMethods": ["PIX", "CARD_ONLINE"] },
  "pending": null
}
```

`PUT /api/store/me/payments`:

```json
{
  "enabledMethods": ["PIX", "CASH"]
}
```

Se a lista vier vazia ou ausente, o serviço volta ao default `["PIX", "CARD_ONLINE"]`. A alteração **não é persistida**: a próxima leitura retorna o default.

O app Android envia:

```json
{
  "config": { "...": "..." }
}
```

Como o backend lê `enabledMethods`, o corpo é ignorado e a resposta permanece no default. Ver lacunas.

`GET /api/store/me/couriers`:

```json
[
  {
    "id": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
    "name": "Carlos Mendes",
    "vehicle": "Moto",
    "terms": "Por entrega - R$ 6,00",
    "status": "BUSY"
  }
]
```

Não há endpoint para criar, editar ou remover entregador.

---

## 8. Códigos de status e erros

### 8.1 O que o backend retorna hoje

| Código | Quando aparece |
|---|---|
| `200` | Praticamente todas as operações bem-sucedidas, inclusive criação. |
| `204` | Apenas `POST /api/auth/password/reset`. |
| `400` | Validação Jakarta, `ResponseStatusException(BAD_REQUEST)`, itens vazios. |
| `401` | Token ausente/inválido em rota protegida pelo Spring Security. |
| `403` | Papel insuficiente, cadastro público com perfil diferente de `CUSTOMER` ou conta desativada. |
| `404` | `ResponseStatusException(NOT_FOUND)` em alguns fluxos (pedido, usuário, prato). |
| `409` | `ResponseStatusException(CONFLICT)` em registro/vinculação, e-mail duplicado, indisponibilidade de janela e falta de capacidade na agenda. |
| `500` | `RuntimeException` não tratada, conversão inválida ou entidade não encontrada. |
| `503` | SMS não configurado ou falha no Twilio. |

### 8.2 Corpo de erro

O identity-service tem `@RestControllerAdvice` (`ApiExceptionHandler`) e devolve mensagem legível:

```json
{
  "status": 400,
  "message": "Selecione a loja do vendedor",
  "detail": "Selecione a loja do vendedor"
}
```

Em erros de validação há também `errors[]` com `field` e `message`. Tenant, catalog e order ainda não têm `@ControllerAdvice`; nesses serviços o corpo tende a ser o padrão do Spring Boot, sem o motivo:

```json
{
  "timestamp": "2026-10-26T12:00:00.000+00:00",
  "status": 500,
  "error": "Internal Server Error",
  "path": "/api/orders"
}
```

O frontend trata `message`, `detail`, `errors` e `violations` de forma defensiva.

### 8.3 Como o frontend lida com erros

`frontend/src/lib/apiClient.ts`:

- `apiRequest` lança `ApiError` com `status`, `message` e `body`.
- Status `0` significa falha de rede/conexão.
- `204` e corpo vazio retornam `undefined`.
- `messageFromApiBody` prioriza `message`, `detail`, `title`, `error`, `errors[]` e `violations[]`.
- `getApiErrorFeedback` classifica `400`, `409` e `422` como warning; os demais como erro.
- `adminApi` limpa a sessão e redireciona para `/admin/login` em `401`.
- O Android classifica falhas em `AppViewModel` e exibe `UiFeedback`.

---

## 9. Exemplo ponta a ponta

### 9.1 Login e listagem de lojas

```bash
curl -s http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@delivery.com","password":"admin123"}'
```

```bash
curl -s "http://localhost:8080/api/tenants?all=true"
```

### 9.2 Cardápio

```bash
curl -s "http://localhost:8080/api/catalog/tenants/11111111-1111-1111-1111-111111111111/dishes?availableOnly=true"
```

### 9.3 Pedido

```bash
curl -s -X POST http://localhost:8080/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId":"11111111-1111-1111-1111-111111111111",
    "customerName":"Maria Souza",
    "customerPhone":"(11) 98888-1234",
    "deliveryAddress":"Rua das Acácias, 210",
    "paymentMethod":"PIX",
    "deliveryFee":6.00,
    "items":[{"dishId":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","dishName":"Pizza","quantity":1,"unitPrice":54.90}]
  }'
```

### 9.4 Fila do vendedor

```bash
curl -s http://localhost:8080/api/store/me/orders
```

### 9.5 Aceite e pronto

```bash
curl -s -X POST http://localhost:8080/api/store/me/orders/4822/accept
curl -s -X POST http://localhost:8080/api/store/me/orders/4822/ready
```

### 9.6 Status e entregador

```bash
curl -s -X PATCH http://localhost:8080/api/orders/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/status \
  -H "Content-Type: application/json" \
  -d '{"status":"PICKED_UP","courierId":"dddddddd-dddd-dddd-dddd-dddddddddddd"}'
```

---

## 10. Contrato de erro recomendado

Este é o alvo sugerido, **não implementado**. Adotar RFC 9457 (*Problem Details for HTTP APIs*) reduz a dependência de campos proprietários:

```json
{
  "type": "https://deliveryhub.com.br/errors/validation",
  "title": "Dados inválidos",
  "status": 400,
  "detail": "O campo customerName é obrigatório.",
  "instance": "/api/orders",
  "errors": [
    { "field": "customerName", "message": "é obrigatório" }
  ]
}
```

| Código | Uso recomendado |
|---|---|
| `400` | Sintaxe/validação de entrada. |
| `401` | Não autenticado ou token inválido/expirado. |
| `403` | Autenticado sem permissão. |
| `404` | Recurso inexistente. |
| `409` | Conflito de estado/unicidade. |
| `422` | Regra de negócio violada. |
| `429` | Rate limit. |
| `500` | Falha inesperada, sem detalhes sensíveis. |
| `503` | Dependência externa indisponível. |

Regras:

- Não expor stack trace, SQL, segredo ou dado pessoal.
- Mensagem útil para o usuário e código estável para o cliente.
- `Content-Type: application/problem+json`.
- Padronizar `timestamp`/`traceId` para suporte.

---

## 11. Lacunas conhecidas do contrato

| # | Lacuna | Impacto | Evidência | Correção sugerida |
|---|---|---|---|---|
| 1 | Desativação não revoga token | Conta desativada continua operando até o token expirar | `active` + JWT sem lista de revogação | Lista de revogação ou token curto |
| 2 | Escritas públicas em catálogo | Qualquer um altera preço/prato | `POST/PUT/PATCH /api/catalog/**` | `@PreAuthorize` + regra no gateway |
| 3 | Status de pedido público | Cliente ou terceiro muda o pedido | `PATCH /api/orders/{id}/status` | Autorizar vendedor/entregador/admin |
| 4 | Sem escopo por tenant | Vazamento entre lojas | `GET /api/store/me/orders`, `GET /api/store/me/dishes` | Filtrar por `tenant_id` do JWT |
| 5 | Vendedor web sem `Authorization` | Sessão não protege chamadas | `frontend/src/lib/api.ts` | Interceptor de token |
| 6 | `courierId` inválido no web | Aceite de entrega falha com 500 | `courier-carlos-1` | UUID real + validação |
| 7 | Android envia `config` | Alteração de pagamentos sem efeito | `ProposePaymentsRequest` | Alinhar para `enabledMethods` |
| 8 | Pagamentos não persistem | UI mostra alteração que some | `StoreController` | Tabela/entidade de configuração |
| 9 | Status livre | Estados inconsistentes | `updateStatus` | Máquina de estados + histórico |
| 10 | `status`/`courierId` ausentes | 500 em vez de 400 | `valueOf`/`UUID.fromString` | Validar e retornar 400 |
| 11 | Sem idempotência | Pedido duplicado em retry | `POST /api/orders` | `Idempotency-Key` + unique |
| 12 | Sem paginação | Listas crescem sem limite | `findAll` | `Pageable` e filtros |
| 13 | Sem versionamento | Quebra de contrato | `/api` | `/api/v1` ou header |
| 14 | Sem rate limit | Abuso e brute force | Gateway | Bucket4j/Redis ou borda |
| 15 | `DELIVERED` vira `READY` no app | Status final ambíguo | `StoreOrderController.mobileStatus` | Mapear `DELIVERED` |
| 16 | `GET /api/store/me` usa a primeira loja | Loja errada em multi-tenant | `currentTenant()` | Resolver pelo JWT |
| 17 | Preço confiado ao cliente | Fraude de valor | `CreateOrderRequest.unitPrice` | Recalcular no catálogo |
| 18 | Registro público sem verificação | Contas falsas/spam | `POST /api/auth/register` | Verificação de e-mail/telefone |
| 19 | Sem política de senha no registro | Senhas fracas | `@NotBlank` apenas | Mínimo e complexidade |
| 20 | Status de tenant livre | Valores fora do domínio | `updateStatus` | Enum validado |
| 21 | Erro sem contrato nos serviços de domínio | Frontend depende de heurística | `@ControllerAdvice` só no identity | Problem Details em todos |
| 22 | OpenAPI sem segurança em tenant/catalog/order | Documentação enganosa | `OpenApiConfig` | Security scheme + auth |
| 23 | Sem CORS específico por origem em produção | Superfície ampla | `CorsConfiguration` | Lista explícita |
| 24 | Sem `201 Created`/`Location` | Semântica HTTP pobre | `ResponseEntity.ok` | `201` + `Location` |
| 25 | SSE sem autenticação e sem escopo | Terceiros acompanham pedidos de qualquer loja | `GET /api/store/me/orders/stream` | Autenticar e filtrar pelo `tenant_id` do JWT |
| 26 | SSE sem replay | Eventos perdidos em reconexão | `SseOrderEventRegistry` | `Last-Event-ID` ou recarga explícita |
| 27 | Agenda pública sem autenticação | Terceiros enumeram números, status e itens de uma loja | `GET /api/orders/tenant/{tenantId}/agenda` | Token de cliente ou link assinado com escopo por loja |
| 28 | Agenda em horário local | Sem fuso, DST ou loja em outro fuso | `LocalDateTime.now()` no `SchedulingService` | Definir `ZoneId` por tenant e persistir com offset |

---

## 12. Versionamento e compatibilidade

- Não há versão na URL nem header.
- Mudanças incompatíveis devem ser tratadas como **quebra de contrato**.
- Recomendação: introduzir `/api/v1` ou header `X-API-Version` antes de expor a API a terceiros.
- Toda mudança de contrato deve atualizar este documento, a especificação OpenAPI e o changelog.
- Período de depreciação sugerido: pelo menos uma release/Minor antes da remoção.

---

## 13. Checklist de integração

- [ ] Use o gateway (`:8080`), não as portas internas.
- [ ] Envie `Authorization: Bearer <token>` em rotas administrativas.
- [ ] Trate `400`, `401`, `403`, `404`, `409`, `422`, `500` e `503` com mensagens distintas.
- [ ] Não assuma que uma escrita em catálogo/pedido está protegida.
- [ ] Não assuma que `GET /api/store/me/*` retorna apenas a loja do usuário.
- [ ] Não dependa de `distanceKm` ou `secondsToAccept` como dados reais.
- [ ] Trate `409` do checkout como ausência de capacidade e ofereça outra janela.
- [ ] Use `GET /agenda` apenas para acompanhamento: o payload é sanitizado e não traz o pedido completo.
- [ ] Não envie `courierId` que não seja UUID.
- [ ] Não dependa de persistência de métodos de pagamento.
- [ ] Não assuma idempotência em `POST /api/orders`.
- [ ] Valide o contrato contra o OpenAPI gerado antes de integrar.
