# Documentação técnica — Delivery Marketplace

| Campo | Valor |
|---|---|
| Status | Documentação as-is do código atual |
| Público | Engenharia, produto, operações, QA e revisores técnicos |
| Última revisão | 2026-10-27 |
| Referência de código | `master` em `a89f1b1` + submódulos + alterações locais no diretório de trabalho |
| Fonte de verdade | Código, configurações, migrações e contratos expostos pelo runtime |

> Esta documentação descreve **o que o repositório faz hoje**, não a plataforma que ele pretende ser. A visão-alvo está em [`../arquitetura.md`](../arquitetura.md) e é explicitamente marcada como **Planejado** quando aparece aqui.

---

## 1. Comece por aqui

| Se você quer... | Leia |
|---|---|
| Entender o produto, os perfis e o escopo real | [`01-visao-geral.md`](01-visao-geral.md) |
| Entender serviços, fluxos e implantação | [`02-arquitetura.md`](02-arquitetura.md) |
| Chamar a API ou integrar um cliente | [`03-api.md`](03-api.md) |
| Entender bancos, tabelas e migrações | [`04-dados.md`](04-dados.md) |
| Subir o ambiente, operar e resolver problemas | [`05-operacao.md`](05-operacao.md) |
| Avaliar autenticação, autorização e riscos | [`06-seguranca.md`](06-seguranca.md) |
| Saber o que é testado e como testar | [`07-qualidade-e-testes.md`](07-qualidade-e-testes.md) |
| Contribuir com código e documentação | [`08-desenvolvimento.md`](08-desenvolvimento.md) |
| Entender decisões arquiteturais | [`09-decisoes/README.md`](09-decisoes/README.md) |
| Saber quais padrões de documentação foram adotados | [`../padroes-documentacao.md`](../padroes-documentacao.md) |

---

## 2. Estado do sistema em uma página

| Área | Estado | Observação |
|---|---|---|
| API Gateway | **Implementado** | Spring Cloud Gateway MVC na porta `8080`; roteia HTTP e agrega Swagger. |
| Autenticação | **Implementado** | Login, registro, JWT HS256, recuperação de senha por SMS. |
| Autorização | **Parcial** | Apenas rotas administrativas e mutações de tenant são restritas no gateway; catálogo, pedidos e app vendedor estão abertos. |
| Lojas (tenant) | **Implementado** | CRUD administrativo, tema por slug, status e configurações de entrega. |
| Catálogo | **Implementado** | Pratos, categorias, disponibilidade, esforço de cozinha e campos JSON de horários/opcionais. |
| Pedidos | **Parcial** | Criação com reserva de agenda, listagem, mudança de status, agenda pública e eventos (SSE + Kafka producer); pagamento simulado; sem máquina de estados, idempotência ou consumidor Kafka. |
| Entregadores | **Parcial** | Cadastro de conta e listagem de entregadores por loja; sem dispatch, tracking ou app dedicado. |
| Pagamentos | **Parcial** | Métodos são exibidos e editáveis apenas em memória; não há integração com PSP. |
| Frontend web | **Implementado** | Next.js 16 com áreas de cliente, vendedor, entregador e admin. |
| App Android | **Implementado** | Dois apps Kotlin/Compose: cliente e vendedor, ambos com Retrofit e sessão local. |
| Mensageria | **Parcial** | O order-service publica `order-events` no Redpanda e entrega por SSE; não há consumidor Kafka. |
| Cache | **Planejado** | Redis está no Docker Compose, mas não é usado pelo código. |
| Observabilidade | **Parcial** | Apenas Actuator `health` e `info`; sem métricas, tracing ou logs estruturados. |
| Testes automatizados | **Parcial** | Cinco testes de contexto no backend; nenhum teste de comportamento, frontend ou Android. |
| Repositórios | **Implementado** | Polyrepo com 8 submódulos (5 serviços, web e 2 apps) amarrados pelo guarda-chuva — [ADR 0011](09-decisoes/0011-polyrepo-com-submodulos.md). |
| CI/CD | **Planejado** | Não há pipeline versionado no repositório. |

---

## 3. Mapa dos documentos

```text
docs/
├── padroes-documentacao.md
└── tecnica/
    ├── README.md                       # este hub
    ├── 01-visao-geral.md               # problema, personas, escopo, glossário
    ├── 02-arquitetura.md               # arc42 + C4, fluxos e implantação
    ├── 03-api.md                       # referência HTTP, erros e lacunas
    ├── 04-dados.md                     # schemas, migrações, seeds e multi-tenancy
    ├── 05-operacao.md                  # setup, runbooks e troubleshooting
    ├── 06-seguranca.md                 # JWT, papéis, ameaças e hardening
    ├── 07-qualidade-e-testes.md        # estratégia, cenários e CI
    ├── 08-desenvolvimento.md           # convenções, PRs, commits e ADRs
    ├── 09-decisoes/
    │   ├── README.md
    │   ├── 0001-microsservicos-e-api-gateway.md
    │   ├── 0002-database-per-service-e-liquibase.md
    │   ├── 0003-jwt-hs256-no-gateway-e-identity.md
    │   ├── 0004-frontend-nextjs-unico.md
    │   ├── 0005-documentacao-como-codigo.md
    │   ├── 0006-postgresql-como-fonte-de-verdade.md
    │   ├── 0007-pagamento-simulado-no-order-service.md
    │   ├── 0008-eventos-de-pedido-com-sse-e-kafka.md
    │   ├── 0009-agenda-de-producao-por-esforco.md
    │   └── 0010-cadastro-de-usuarios-por-perfil-e-tenant.md
    └── _templates/
        ├── adr.md
        ├── runbook.md
        └── mudanca-api.md
```

---

## 4. Legenda de status

| Rótulo | Significado |
|---|---|
| **Implementado** | Existe no código e é exercitado pelo runtime atual. |
| **Parcial** | Existe, mas com limitação relevante ou cobertura incompleta. |
| **Planejado** | Está na visão-alvo ou no roadmap; não existe no código. |
| **Divergente** | Documento histórico ou interface contradiz o código. |
| **Legado** | Mantido por compatibilidade, sem uso atual. |

---

## 5. Divergências que você deve conhecer antes de mexer

Estas divergências são reais e estão detalhadas nos documentos indicados:

| Divergência | Onde está documentada |
|---|---|
| `README.md` cita Spring Boot 3 e H2 como padrão; o código usa Spring Boot 4.1.1 e PostgreSQL com Liquibase. | [`01-visao-geral.md`](01-visao-geral.md#7-divergências-em-relação-à-documentação-existente) |
| `docs/arquitetura.md` descreve BFFs, Kafka, Saga, Payment, Dispatch e Tracking que não existem. | [`02-arquitetura.md`](02-arquitetura.md#12-o-que-é-alvo-e-o-que-é-implementado) |
| O app do vendedor web não envia `Authorization` nas chamadas de catálogo/pedidos. | [`06-seguranca.md`](06-seguranca.md#43-lacunas-de-autorização) |
| A tela do entregador envia `courier-carlos-1` como `courierId`, mas o backend espera UUID. | [`03-api.md`](03-api.md#11-lacunas-conhecidas-do-contrato) |
| O Android envia `{ "config": ... }` em `PUT /api/store/me/payments`, mas o backend lê `enabledMethods`. | [`03-api.md`](03-api.md#11-lacunas-conhecidas-do-contrato) |
| Métodos de pagamento não são persistidos; a resposta é recalculada em memória. | [`04-dados.md`](04-dados.md#9-dados-que-não-são-persistidos) |
| `OrderDataSeeder` roda sem a flag de demo data e depende do tenant-service no startup. | [`05-operacao.md`](05-operacao.md#6-dados-de-demonstração) |
| O gateway usa `localhost` fixo para os serviços, o que impede um deploy containerizado direto. | [`05-operacao.md`](05-operacao.md#10-limitações-de-implantação) |
| A agenda de produção usa `LocalDateTime` sem fuso e não tem lock contra overbooking concorrente. | [`09-decisoes/0009-agenda-de-producao-por-esforco.md`](09-decisoes/0009-agenda-de-producao-por-esforco.md) |

---

## 6. Como manter esta documentação

1. Atualize o documento afetado **no mesmo PR** da mudança.
2. Se a mudança for estrutural, crie ou atualize um ADR em `09-decisoes/`.
3. Atualize a data de `Última revisão` no documento e neste hub quando o escopo mudar.
4. Rode a verificação de links e o lint de Markdown antes de abrir o PR (quando configurados).
5. Não copie segredos reais para exemplos.
6. Se encontrar uma divergência, prefira registrar a divergência a “corrigir” o texto para uma intenção não implementada.

O procedimento completo, com mapa de impacto por tipo de mudança e checklist de validação, está em [`.agents/skills/atualizar-documentacao-tecnica/SKILL.md`](../../.agents/skills/atualizar-documentacao-tecnica/SKILL.md).

O processo completo, os critérios de revisão e as ferramentas recomendadas estão em [`../padroes-documentacao.md`](../padroes-documentacao.md).

---

## 7. Documentos de apoio existentes

| Documento | Conteúdo | Relação com esta documentação |
|---|---|---|
| [`../api-configuracoes-admin.md`](../api-configuracoes-admin.md) | API de configurações administrativas, equipe e auditoria | Detalhamento de endpoints também cobertos em `03-api.md` |
| [`../redefinicao-senha-sms.md`](../redefinicao-senha-sms.md) | Configuração do Twilio e fluxo de código SMS | Detalhamento operacional de `POST /api/auth/password/forgot` |
| [`../tempo-real-pedidos.md`](../tempo-real-pedidos.md) | Eventos de pedido, SSE, Kafka e próxima etapa (FCM) | Detalhamento de `02-arquitetura.md` §8.10 |
| [`../arquitetura.md`](../arquitetura.md) | Visão-alvo de arquitetura | Marcado como **Planejado**; não descreve o as-is |
| [`../../README.md`](../../README.md) | Porta de entrada do repositório | Pode conter referências históricas; prevalece a documentação técnica |

---

## 8. Convenções de links

- Links internos usam caminhos relativos e `kebab-case`.
- Links para código apontam para o arquivo e, quando útil, para a classe/método.
- Links externos são absolutos e apontam para a fonte primária (norma, especificação ou documentação oficial).
- Ao mover um documento, atualize todos os links de entrada e este hub.
