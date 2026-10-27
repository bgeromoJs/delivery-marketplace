# 0006 — PostgreSQL como banco de todos os ambientes

| Campo | Valor |
|---|---|
| Status | Aceito |
| Data de registro | 2026-10-26 |
| Decisores | Equipe de engenharia (registro retroativo) |
| Impacto | Dados |
| Substitui | — |
| Substituído por | — |

## Contexto e problema

O `README.md` afirma que “todos os microsserviços possuem o banco em memória H2 configurado por padrão”. O código diz outra coisa: os quatro serviços com persistência apontam para PostgreSQL 16, usam Liquibase e validam o schema com `ddl-auto: validate`.

H2 permanece como dependência `runtime` em identity, tenant, catalog e order, mas nenhum perfil o utiliza. Essa ambiguidade gera três problemas: documentação incorreta, falsa expectativa de “subir sem infraestrutura” e risco de alguém trocar o datasource e mascarar incompatibilidades de SQL.

> Qual banco deve ser a referência de desenvolvimento, teste e produção?

## Forças de decisão

- **F1** — O schema é gerenciado por Liquibase, com tipos específicos (`jsonb`, `uuid`, `timestamptz`).
- **F2** — Consultas usam recursos de PostgreSQL (cast, `jsonb`, funções de data).
- **F3** — Desenvolvimento local precisa ser simples e reproduzível.
- **F4** — Divergência entre banco de dev e produção é uma das principais causas de incidente.
- **F5** — H2 já está no classpath e não pode ser removido sem revisar os POMs.

## Opções consideradas

### Opção 1 — H2 em desenvolvimento, PostgreSQL em produção

**Prós**

- Subida sem Docker.
- Testes mais rápidos.

**Contras**

- Dialetos diferentes: `jsonb`, `uuid`, `on conflict` e funções não são idênticos.
- Liquibase pode aplicar sem erro e falhar em produção.
- Testes passam em um banco que nunca será usado de verdade.

### Opção 2 — PostgreSQL em todos os ambientes (escolhida)

Docker Compose local com PostgreSQL 16, o mesmo banco em teste (Testcontainers, recomendado) e em produção.

**Prós**

- Paridade real entre ambientes.
- Liquibase e SQL validados no banco correto.
- Tipos e índices idênticos.

**Contras**

- Exige Docker no desenvolvimento.
- Testes dependem de serviço externo (hoje sem Testcontainers).
- Um banco a mais para operar.

### Opção 3 — PostgreSQL em dev/prod e H2 apenas em testes unitários

**Prós**

- Testes de unidade sem infraestrutura.
- Integração com PostgreSQL real.

**Contras**

- Exige separar testes de unidade de integração.
- Ainda permite divergência em testes de fatia JPA.
- Não é o estado atual e adiciona complexidade de configuração.

## Decisão

**Escolhemos a opção 2.**

Evidências no código:

```yaml
# backend/identity-service/src/main/resources/application.yml
datasource:
  url: ${SPRING_DATASOURCE_URL:jdbc:postgresql://localhost:5432/identity_db}
  driverClassName: ${SPRING_DATASOURCE_DRIVER:org.postgresql.Driver}
jpa:
  hibernate:
    ddl-auto: validate
liquibase:
  change-log: classpath:db/changelog/db.changelog-master.yaml
```

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
```

O [`docker/init-db.sql`](../../../docker/init-db.sql) cria os quatro bancos. O H2 permanece no classpath, mas **não é utilizado** por nenhum perfil.

## Consequências

### Positivas

- Schema e queries validados no banco de produção.
- Liquibase aplica changesets com o dialeto correto.
- `ddl-auto: validate` detecta divergência entre entidade e banco real.
- Um único conjunto de instruções de setup em [`05-operacao.md`](../05-operacao.md).

### Negativas

- **README desatualizado.** A afirmação sobre H2 é **Divergente** e induz ao erro.
- **Dependência de Docker** para rodar testes de contexto.
- **Testes não são herméticos.** `mvn test` exige PostgreSQL no ar; não há Testcontainers.
- **H2 no classpath** sem uso: confunde e adiciona superfície de dependência.
- **Sem paridade automatizada.** Nada garante que o Postgres local e o de produção tenham a mesma versão de minor.

### Neutras

- O PostgreSQL local roda em container; produção não está definida no repositório.
- Redis e Redpanda compartilham o mesmo Compose; o order-service publica eventos no Redpanda.

## Riscos e mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Alguém configura H2 e “funciona” localmente | Média | Alto | Remover H2 dos POMs ou documentar como não suportado |
| Testes falham em máquina limpa | Alta | Médio | Testcontainers + perfil de teste |
| Versão do PostgreSQL divergir | Média | Médio | Fixar `postgres:16-alpine`; verificar em produção |
| Dados de dev vazarem para produção | Baixa | Crítico | Credenciais e bancos distintos; seed desabilitado |
| Volume perdido no Docker | Média | Alto | Backup e procedimento de restauração |

## Confirmação

- Nenhum `application.yml` ativo usa `jdbc:h2`.
- `docker compose up -d` é pré-requisito documentado para testes.
- O README raiz é corrigido ou marcado como histórico.
- Todo changeset é testado em PostgreSQL 16.

## Mais informações

- [`04-dados.md`](../04-dados.md) — schemas e migrações
- [`05-operacao.md`](../05-operacao.md) — subida do PostgreSQL
- [`01-visao-geral.md`](../01-visao-geral.md#7-divergências-em-relação-à-documentação-existente) — divergências do README
- [PostgreSQL 16 Documentation](https://www.postgresql.org/docs/16/)
- [Testcontainers PostgreSQL](https://java.testcontainers.org/modules/databases/postgres/)
