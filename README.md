# 🚀 Delivery Marketplace Multi-tenant

Plataforma completa de delivery com **Backend em Microsserviços (Java 21 / Spring Boot 4.1.1)** e **Frontend Único (Next.js 16 / TypeScript / Tailwind CSS)**, cobrindo os 4 perfis do ecossistema: **Cliente**, **Vendedor**, **Entregador** e **Administrador**.

---

## 📁 Estrutura de Diretórios da Raiz

O projeto é um **polyrepo**: cada serviço, o frontend e cada app Android têm repositório Git próprio, e este repositório é o **guarda-chuva** que amarra as versões por submódulos.

```text
delivery-marketplace/          # guarda-chuva: orquestração, docs e scripts
│
├── 🌐 frontend/                # SUBMÓDULO → repo próprio (Next.js 16, TypeScript, Tailwind CSS)
│   ├── src/app/
│   │   ├── page.tsx            # Hub Geral com atalhos para todos os perfis
│   │   ├── loja/[slug]/        # App do Cliente (White-label dinâmico, carrinho, checkout Pix/Cartão, rastreio)
│   │   ├── vendedor/           # Portal do Vendedor (Kanban de pedidos em tempo real e estoque)
│   │   ├── entregador/         # App do Entregador (Online/Offline, ofertas, rota de coleta e entrega)
│   │   └── admin/              # Painel Master Admin (GMV, comissões de 12%, gestão de lojas)
│   ├── src/lib/api.ts          # Cliente de API integrado ao Gateway com fallback
│   └── package.json
│
├── ☕ backend/                 # SUBMÓDULOS → um repo por serviço (Java 21 / Spring Boot 4.1.1)
│   ├── api-gateway/            # :8080 — Spring Cloud Gateway e CORS
│   ├── identity-service/       # :8081 — Autenticação, usuários, papéis e JWT
│   ├── tenant-service/         # :8082 — Lojas, slugs, temas dinâmicos e taxas
│   ├── catalog-service/        # :8083 — Categorias, pratos, adicionais e estoque
│   └── order-service/          # :8084 — Máquina de estados e Saga do pedido
│
├── 📱 mobile/                  # SUBMÓDULOS → um repo por app (Kotlin / Compose)
│   ├── cliente-android/        # App do cliente
│   └── vendedor-android/       # App do vendedor
│
├── 🐳 docker/
│   └── init-db.sql             # Criação dos bancos isolados por serviço (database-per-service)
│
├── 🛠️ scripts/
│   ├── bootstrap.ps1           # Baixa os submódulos no SHA registrado
│   └── set-submodule-urls.ps1  # Aponta os submódulos para o host real
│
├── 📄 docs/                    # Documentação do projeto (hub em docs/tecnica/README.md)
├── 🐳 docker-compose.yml       # PostgreSQL 16, Redis 7 e Kafka (Redpanda)
├── 📝 README.md                # Este guia
└── ⚙️ .gitmodules              # Os 8 submódulos e suas URLs
```

---

## 📥 Como obter o código

O clone precisa dos submódulos; sem eles, `backend/`, `frontend/` e `mobile/` ficam vazios.

```powershell
git clone --recurse-submodules <url-do-guarda-chuva> delivery-marketplace
cd delivery-marketplace

# Em um clone já existente:
.\scripts\bootstrap.ps1
```

Ao alterar um projeto, commite e faça push **dentro** do repositório dele antes de commitar o ponteiro no guarda-chuva. Detalhes em [`docs/tecnica/08-desenvolvimento.md`](docs/tecnica/08-desenvolvimento.md).

---

## 🌐 Como Rodar o Frontend

O frontend é um projeto independente. Para iniciar:

```powershell
cd frontend
npm run dev
```

Abra **[http://localhost:3000](http://localhost:3000)** no navegador.

### Páginas do Frontend:
| Rota | Perfil | Descrição |
|---|---|---|
| `/` | **Hub Central** | Apresentação e atalhos rápidos para alternar entre os perfis |
| `/loja/pizzaria-do-joao` | **Cliente** | Cardápio tema Carmim, carrinho retrátil, checkout Pix/Cartão e rastreio |
| `/loja/burger-artesanal` | **Cliente** | Cardápio tema Âmbar (Smash Burgers) |
| `/loja/sushi-prime` | **Cliente** | Cardápio tema Slate (Combinados japoneses) |
| `/vendedor` | **Vendedor** | Kanban da cozinha (Recebidos, Preparo, Prontos), estoque e abertura da loja |
| `/entregador` | **Entregador** | Toggle Online/Offline, ofertas disponíveis, coleta e entrega com PIN |
| `/admin` | **Admin** | Métricas financeiras (GMV, comissões de 12%), suspensão e aprovação de lojas |

---

## ☕ Como Rodar o Backend (Microsserviços Java 21)

Cada serviço é um repositório independente, com o próprio `pom.xml` e o próprio Maven Wrapper. Não existe mais um agregador no diretório `backend/`: o build é sempre por serviço.

```powershell
# Exemplo: API Gateway (Porta 8080)
cd backend\api-gateway
.\mvnw.cmd test-compile -DskipTests
.\mvnw.cmd spring-boot:run
```
.\mvnw.cmd spring-boot:run

# Exemplo: Tenant Service (Porta 8082)
cd backend\tenant-service
.\mvnw.cmd spring-boot:run

# Exemplo: Order Service (Porta 8084)
cd backend\order-service
.\mvnw.cmd spring-boot:run
```

> **Banco de Dados em Desenvolvimento:** os serviços usam **PostgreSQL 16** com migrações Liquibase (`ddl-auto: validate`). Suba a infraestrutura com `docker compose up -d` antes de iniciar qualquer serviço.

### 📘 Documentação das APIs (Swagger / OpenAPI)

Cada serviço publica a especificação OpenAPI 3 e uma UI do Swagger:

| Serviço | Swagger UI | OpenAPI JSON |
|---|---|---|
| **Agregado (Gateway)** | http://localhost:8080/swagger-ui.html | — |
| identity-service | http://localhost:8081/swagger-ui.html | http://localhost:8081/v3/api-docs |
| tenant-service | http://localhost:8082/swagger-ui.html | http://localhost:8082/v3/api-docs |
| catalog-service | http://localhost:8083/swagger-ui.html | http://localhost:8083/v3/api-docs |
| order-service | http://localhost:8084/swagger-ui.html | http://localhost:8084/v3/api-docs |

O Swagger do **gateway** agrega os quatro serviços: use o seletor *Select a definition*
no topo da página. Ele busca `/v3/api-docs/{identity|tenant|catalog|order}`, que o
gateway encaminha para o serviço correspondente.

Para testar endpoints protegidos, faça `POST /api/auth/login`, copie o token e clique
em **Authorize**.

---

## 🐳 Ambiente completo com Docker (infra + backend + frontend)

Um comando sobe tudo: PostgreSQL 16 (com os bancos `identity_db`, `tenant_db`, `catalog_db`, `order_db`), Redis, Kafka (Redpanda), os 5 serviços e o frontend.

```powershell
Copy-Item .env.example .env          # primeira vez
docker compose up -d --build         # ou: .\scripts\dev.ps1 up
```

A primeira subida compila 6 imagens e leva de 10 a 20 minutos; as seguintes usam cache.

| Endereço | O que é |
|---|---|
| http://localhost:3000 | Frontend web |
| http://localhost:8080 | API Gateway |
| http://localhost:8080/swagger-ui.html | Swagger agregado |
| http://localhost:8085 | Console do Redpanda |

### Só a infraestrutura (apps nativas, com hot reload)

```powershell
docker compose up -d postgres redis redpanda redpanda-console redpanda-init
# ou: .\scripts\dev.ps1 infra
```

Depois suba os serviços com `.\mvnw.cmd spring-boot:run` e o frontend com `npm run dev`.

### Comandos úteis

```powershell
.\scripts\dev.ps1 ps       # estado dos containers
.\scripts\dev.ps1 logs     # logs de tudo
.\scripts\dev.ps1 down     # para tudo, mantém os dados
.\scripts\dev.ps1 reset    # apaga volumes e recria os bancos
```

> Em containers **não há hot reload**: alterar Java exige `docker compose build <serviço>`. E `NEXT_PUBLIC_API_URL` é embutido no bundle em tempo de build.

O Redpanda expõe a API Kafka em `localhost:19092` e um console web em
**[http://localhost:8085](http://localhost:8085)**. O tópico `order-events` é criado
automaticamente na subida.

### ⚡ Pedidos em tempo real

O order-service publica `ORDER_CREATED`, `ORDER_UPDATED` e `ORDER_CANCELLED` no tópico
`order-events` e entrega os mesmos eventos ao app vendedor por SSE
(`GET /api/store/me/orders/stream`). Assim o pedido novo aparece sem atualizar a tela.

Detalhes, contrato do evento, testes com `curl` e o próximo passo (push FCM com o app
fechado) estão em **[`docs/tempo-real-pedidos.md`](docs/tempo-real-pedidos.md)**.

---

## 📚 Documentação técnica

A documentação técnica descreve **o que o código faz hoje** (Spring Boot 4.1.1, PostgreSQL 16, Next.js 16), com status explícito para cada capacidade: Implementado, Parcial, Planejado, Divergente ou Legado.

| Documento | Conteúdo |
|---|---|
| **[`docs/tecnica/README.md`](docs/tecnica/README.md)** | Hub: estado do sistema, mapa dos documentos e divergências conhecidas |
| [`docs/tecnica/01-visao-geral.md`](docs/tecnica/01-visao-geral.md) | Problema, personas, escopo real e glossário |
| [`docs/tecnica/02-arquitetura.md`](docs/tecnica/02-arquitetura.md) | Arquitetura as-is (arc42 + C4), fluxos, implantação e riscos |
| [`docs/tecnica/03-api.md`](docs/tecnica/03-api.md) | Referência HTTP, autenticação, erros e lacunas de contrato |
| [`docs/tecnica/04-dados.md`](docs/tecnica/04-dados.md) | Schemas, migrações Liquibase, seeds e multi-tenancy |
| [`docs/tecnica/05-operacao.md`](docs/tecnica/05-operacao.md) | Subida, variáveis, health checks, troubleshooting e runbooks |
| [`docs/tecnica/06-seguranca.md`](docs/tecnica/06-seguranca.md) | JWT, autorização, CORS, LGPD, STRIDE e hardening |
| [`docs/tecnica/07-qualidade-e-testes.md`](docs/tecnica/07-qualidade-e-testes.md) | Testes existentes, estratégia, cenários e portões de CI |
| [`docs/tecnica/08-desenvolvimento.md`](docs/tecnica/08-desenvolvimento.md) | Estrutura, convenções, PRs, commits e processo de ADR |
| [`docs/tecnica/09-decisoes/README.md`](docs/tecnica/09-decisoes/README.md) | Índice de decisões arquiteturais (ADRs) |
| [`docs/padroes-documentacao.md`](docs/padroes-documentacao.md) | Padrões, normas e regras editoriais adotados |

> `README.md` e `docs/arquitetura.md` contêm afirmações históricas ou de visão-alvo. Em caso de conflito, prevalecem a documentação técnica e o código.

Ao alterar o projeto, atualize o documento afetado no mesmo commit. O processo está em [`.agents/skills/atualizar-documentacao-tecnica/SKILL.md`](.agents/skills/atualizar-documentacao-tecnica/SKILL.md).

