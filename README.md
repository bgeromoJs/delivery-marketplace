# 🚀 Delivery Marketplace Multi-tenant

Plataforma completa de delivery com **Backend em Microsserviços (Java 21 / Spring Boot 3)** e **Frontend Único (Next.js 16 / TypeScript / Tailwind CSS)**, cobrindo os 4 perfis do ecossistema: **Cliente**, **Vendedor**, **Entregador** e **Administrador**.

---

## 📁 Estrutura de Diretórios da Raiz

O projeto é organizado com backend e frontend claramente separados no mesmo repositório:

```text
delivery-marketplace/
│
├── 🌐 frontend/                # PROJETO ÚNICO FRONTEND (Next.js 16, TypeScript, Tailwind CSS)
│   ├── src/app/
│   │   ├── page.tsx            # Hub Geral com atalhos para todos os perfis
│   │   ├── loja/[slug]/        # App do Cliente (White-label dinâmico, carrinho, checkout Pix/Cartão, rastreio)
│   │   ├── vendedor/           # Portal do Vendedor (Kanban de pedidos em tempo real e estoque)
│   │   ├── entregador/         # App do Entregador (Online/Offline, ofertas, rota de coleta e entrega)
│   │   └── admin/              # Painel Master Admin (GMV, comissões de 12%, gestão de lojas)
│   ├── src/lib/api.ts          # Cliente de API integrado ao Gateway com fallback
│   ├── package.json
│   └── tsconfig.json
│
├── ☕ backend/                 # PROJETO BACKEND EM MICROSSERVIÇOS (Java 21 / Spring Boot 3)
│   ├── pom.xml                 # Aggregator Maven raiz (compila todos os microsserviços juntos)
│   ├── mvnw / mvnw.cmd         # Maven Wrapper raiz
│   ├── api-gateway/            # Porta 8080 - Spring Cloud Gateway e CORS
│   ├── identity-service/       # Porta 8081 - Autenticação, usuários, papéis e JWT
│   ├── tenant-service/         # Porta 8082 - Lojas, slugs, temas dinâmicos e taxas
│   ├── catalog-service/        # Porta 8083 - Categorias, pratos, adicionais e estoque
│   └── order-service/          # Porta 8084 - Máquina de estados e Saga do pedido
│
├── 🐳 docker/                  # Recursos e scripts do Docker
│   └── init-db.sql             # Criação dos bancos isolados por serviço (database-per-service)
│
├── 📄 docs/                    # Documentação do Projeto
│   └── arquitetura.md          # Especificação técnica completa da arquitetura
│
├── 🐳 docker-compose.yml       # PostgreSQL 16, Redis 7 e Kafka (Redpanda)
├── 📝 README.md                # Este guia
└── ⚙️ .gitignore
```

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

Você pode compilar todos os serviços de uma vez a partir da pasta `backend`:

```powershell
cd backend
.\mvnw.cmd test-compile -DskipTests
```

Para rodar qualquer microsserviço individualmente:

```powershell
# Exemplo: API Gateway (Porta 8080)
cd backend\api-gateway
.\mvnw.cmd spring-boot:run

# Exemplo: Tenant Service (Porta 8082)
cd backend\tenant-service
.\mvnw.cmd spring-boot:run

# Exemplo: Order Service (Porta 8084)
cd backend\order-service
.\mvnw.cmd spring-boot:run
```

> **Banco de Dados em Desenvolvimento:** Todos os microsserviços possuem o banco em memória H2 configurado por padrão com seeders de dados automáticos, funcionando imediatamente sem precisar de configurações prévias.

---

## 🐳 Infraestrutura com Docker (PostgreSQL, Redis e Kafka)

Para subir o banco PostgreSQL 16 (com bancos separados `identity_db`, `tenant_db`, `catalog_db`, `order_db`), Redis e Kafka (Redpanda):

```powershell
docker compose up -d
```
