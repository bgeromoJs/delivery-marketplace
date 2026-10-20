# 🚀 Delivery Marketplace Multi-tenant

Sistema completo de marketplace de delivery construído com **Backend em Microsserviços (Java 21 / Spring Boot 3)** e **Frontend Único (Next.js 16 / TypeScript / Tailwind CSS)**, cobrindo os 4 perfis da plataforma: **Cliente**, **Vendedor**, **Entregador** e **Administrador**.

---

## 🏗️ Arquitetura do Projeto

```text
delivery-marketplace/
├── apps/
│   └── web/                    # 🌐 Frontend Único (Next.js, TypeScript, Tailwind)
│       ├── src/app/
│       │   ├── page.tsx               # Hub Central de Demonstração
│       │   ├── loja/[slug]/page.tsx   # App do Cliente (White-label por slug)
│       │   ├── vendedor/page.tsx      # Portal do Vendedor (Kanban cozinha em tempo real)
│       │   ├── entregador/page.tsx    # App do Entregador (Ofertas e despacho)
│       │   └── admin/page.tsx         # Painel Master Admin (Lojas e métricas)
│       └── src/lib/api.ts             # Cliente de API com fallback para desenvolvimento
├── services/                   # ☕ Microsserviços (Java 21 / Spring Boot 3)
│   ├── api-gateway/            # Porta 8080 - Spring Cloud Gateway e CORS
│   ├── identity-service/       # Porta 8081 - Autenticação, usuários e JWT
│   ├── tenant-service/         # Porta 8082 - Lojas, slugs e temas dinâmicos
│   ├── catalog-service/        # Porta 8083 - Categorias, pratos e estoque
│   └── order-service/          # Porta 8084 - Máquina de estados e Saga do pedido
├── docker/
│   └── init-db.sql             # Script de criação dos bancos isolados por serviço
├── docs/
│   └── arquitetura.md          # Especificação detalhada da arquitetura
├── docker-compose.yml          # PostgreSQL 16, Redis 7 e Kafka (Redpanda)
└── README.md
```

---

## ⚡ Como Rodar o Frontend (Aplicação Web Única)

O frontend foi desenvolvido para rodar de forma independente e com visualização imediata, integrando automaticamente com os microsserviços via API Gateway na porta 8080:

```bash
cd apps/web
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no seu navegador.

### Rotas disponíveis no Frontend:
| Rota | Descrição |
|---|---|
| `/` | **Hub Central:** Visão geral e atalhos rápidos para todos os papéis |
| `/loja/pizzaria-do-joao` | **App Cliente:** Cardápio com tema Carmim, carrinho retrátil, checkout Pix/Cartão e rastreio |
| `/loja/burger-artesanal` | **App Cliente:** Tema Âmbar com Smash burgers |
| `/loja/sushi-prime` | **App Cliente:** Tema Slate com combinados japoneses |
| `/vendedor` | **Painel Vendedor:** Kanban de pedidos em tempo real (Recebidos, Cozinha, Prontos) e estoque |
| `/entregador` | **App Entregador:** Toggle Online, ofertas de corridas, rota de coleta e entrega |
| `/admin` | **Painel Admin:** Métricas de GMV, taxas de comissão (12%) e suspensão de lojas |

---

## ☕ Como Rodar os Microsserviços Backend (Java 21 / Spring Boot)

Cada serviço possui seu próprio Maven Wrapper (`mvnw`), podendo ser executado diretamente pelo terminal ou importado na sua IDE (VS Code, IntelliJ IDEA, Eclipse):

### 1. Iniciar o API Gateway (Porta 8080):
```bash
cd services/api-gateway
./mvnw spring-boot:run
```

### 2. Iniciar o Identity Service (Porta 8081):
```bash
cd services/identity-service
./mvnw spring-boot:run
```

### 3. Iniciar o Tenant Service (Porta 8082):
```bash
cd services/tenant-service
./mvnw spring-boot:run
```

### 4. Iniciar o Catalog Service (Porta 8083):
```bash
cd services/catalog-service
./mvnw spring-boot:run
```

### 5. Iniciar o Order Service (Porta 8084):
```bash
cd services/order-service
./mvnw spring-boot:run
```

> **Nota:** Para desenvolvimento local rápido, todos os microsserviços estão configurados com banco em memória H2 por padrão com pré-população de dados (seeders), permitindo que você os execute sem precisar de banco externo pré-configurado!

---

## 🐳 Infraestrutura com Docker (Opcional para Produção)

Para subir o PostgreSQL 16 com bancos isolados por serviço, Redis e Kafka (Redpanda):

```bash
docker compose up -d
```
