# 0002 — Database-per-service com Liquibase

| Campo | Valor |
|---|---|
| Status | Aceito |
| Data de registro | 2026-10-26 |
| Decisores | Equipe de arquitetura (registro retroativo) |
| Impacto | Estrutural |
| Substitui | — |
| Substituído por | — |

## Contexto e problema

Com cinco serviços, é preciso decidir se eles compartilham um banco ou mantêm schemas isolados, e como o schema evolui sem intervenção manual.

Compartilhar tabelas entre serviços cria acoplamento invisível: uma coluna alterada em `orders` quebra o catálogo sem que nenhum compilador avise. Por outro lado, bancos separados impedem `JOIN` entre domínios e exigem chamadas HTTP para compor dados.

> Como isolar os dados por serviço e garantir que o schema evolua de forma reproduzível em qualquer ambiente?

## Forças de decisão

- **F1** — Autonomia de deploy por serviço.
- **F2** — Necessidade de reproduzir o schema em máquina nova e em produção.
- **F3** — Evitar alterações automáticas e destrutivas do Hibernate.
- **F4** — Simplicidade operacional: um único PostgreSQL local.
- **F5** — Consultas entre domínios são poucas e conhecidas.

## Opções consideradas

### Opção 1 — Banco único com schema compartilhado

**Prós**

- `JOIN` livre entre domínios.
- Uma migração para tudo.
- Backup único.

**Contras**

- Acoplamento de schema entre serviços.
- Migração de um serviço pode quebrar outro.
- Contraria a autonomia proposta em [0001](0001-microsservicos-e-api-gateway.md).

### Opção 2 — Database-per-service com Liquibase (escolhida)

Quatro bancos no mesmo PostgreSQL: `identity_db`, `tenant_db`, `catalog_db`, `order_db`.

**Prós**

- Cada serviço é dono do seu schema.
- Liquibase versiona e aplica mudanças de forma determinística.
- `ddl-auto: validate` impede divergência entre entidade e banco.
- Um único servidor PostgreSQL reduz custo local.

**Contras**

- Sem `JOIN` entre domínios; composição via HTTP.
- Quatro changelogs para manter.
- Um `docker compose` compartilhado cria dependência operacional.
- Backup e restauração precisam considerar quatro bancos.

### Opção 3 — Schema único por serviço no mesmo banco

Um banco, um schema PostgreSQL por serviço.

**Prós**

- Isolamento lógico com menos overhead operacional.
- Backup único.

**Contras**

- Permissões e `search_path` exigem disciplina.
- Fronteira mais fácil de violar por engano.
- Não é o que o código implementa.

## Decisão

**Escolhemos a opção 2.**

O script [`docker/init-db.sql`](../../../docker/init-db.sql) cria os quatro bancos. Cada serviço aponta para o seu via `SPRING_DATASOURCE_URL` e aplica seu próprio changelog:

```yaml
spring:
  datasource:
    url: ${SPRING_DATASOURCE_URL:jdbc:postgresql://localhost:5432/identity_db}
  jpa:
    hibernate:
      ddl-auto: validate
  liquibase:
    change-log: classpath:db/changelog/db.changelog-master.yaml
```

O Hibernate **não** cria nem altera tabelas: apenas valida. Toda mudança passa por changeset.

## Consequências

### Positivas

- Schema reproduzível: `docker compose up -d` + subir o serviço cria tudo.
- Mudanças versionadas e auditáveis no Git.
- Impossível um serviço ler tabela de outro por acidente.
- `validate` falha rápido se a entidade divergir do banco.

### Negativas

- **Composição manual.** O frontend faz múltiplas chamadas para montar uma tela; não há agregação no backend.
- **Sem integridade referencial entre domínios.** `orders.tenant_id` não tem FK para `tenants`.
- **Chamadas síncronas frágeis.** `TenantLookup` consulta o tenant-service em tempo de requisição e cai para `null` em falha.
- **Quatro changelogs.** Uma mudança de modelo compartilhada exige coordenação.
- **Sem migração de dados versionada.** Changesets atuais são estruturais.
- **H2 no classpath** de quatro serviços, embora nenhum perfil o use — resquício que confunde.

### Neutras

- O PostgreSQL é único, mas os bancos são logicamente independentes.
- Redis está no Compose sem uso; Redpanda recebe os eventos do order-service.

## Riscos e mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Changeset editado após merge quebra checksum | Média | Alto | Nunca editar changeset aplicado; criar novo |
| `ddl-auto` alterado para `update` por engano | Baixa | Crítico | Revisão de PR e teste de contexto |
| Dados órfãos entre serviços | Alta | Médio | Validação na aplicação; reconciliação periódica |
| Falha do tenant-service afeta pedidos | Alta | Alto | Cache local, fallback explícito, retry com limite |
| Volume do PostgreSQL perdido | Baixa | Crítico | Backup e teste de restauração documentados |

## Confirmação

- Nenhum serviço referencia tabela de outro banco.
- Todo PR com mudança de schema inclui changeset com `rollback`.
- `mvn test` falha se a entidade divergir do banco.
- `docker/init-db.sql` é idempotente em volume novo.

## Mais informações

- [`04-dados.md`](../04-dados.md) — schemas, ER e changesets
- [`05-operacao.md`](../05-operacao.md) — subida do PostgreSQL
- [Liquibase Documentation](https://docs.liquibase.com/)
- [Database per Service — microservices.io](https://microservices.io/patterns/data/database-per-service.html)
