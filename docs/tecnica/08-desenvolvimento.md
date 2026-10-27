# 08 — Desenvolvimento

| Campo | Valor |
|---|---|
| Status | Polyrepo com submódulos implementado; processo de contribuição não formalizado |
| Público | Engenharia, revisores e novos contribuidores |
| Última revisão | 2026-10-27 |
| Escopo | Estrutura, convenções, fluxo de PR, mudanças de API, ADRs e checklists |
| Fonte de verdade | Código, `package.json`, POMs, `tsconfig.json`, `eslint.config.mjs` e `AGENTS.md` |

> Não existe `CONTRIBUTING.md`, template de PR, política de branches ou changelog versionado. Este documento consolida o que o código já pratica e propõe o que falta, marcando cada item como **Implementado**, **Parcial** ou **Planejado**.

---

## 1. Estrutura do repositório

```text
delivery-marketplace/              # repo guarda-chuva (orquestração)
├── .gitmodules                    # 8 submódulos: 5 serviços, web e 2 apps Android
├── backend/
│   ├── pom.xml                    # agregador local de conveniência (não publicado)
│   ├── mvnw / mvnw.cmd
│   ├── api-gateway/               # submódulo → repo próprio — :8080 — Spring Cloud Gateway MVC
│   ├── identity-service/          # submódulo → repo próprio — :8081 — auth, usuários, JWT, auditoria
│   ├── tenant-service/            # submódulo → repo próprio — :8082 — lojas, tema, pagamentos, entregadores
│   ├── catalog-service/           # submódulo → repo próprio — :8083 — pratos e categorias
│   └── order-service/             # submódulo → repo próprio — :8084 — pedidos, status, SSE e producer Kafka
├── frontend/                      # submódulo → repo próprio — Next.js 16 (App Router)
│   ├── src/app/                   # rotas: /, /loja/[slug], /loja/[slug]/agenda, /vendedor, /entregador, /admin
│   ├── src/components/            # componentes compartilhados
│   ├── src/lib/                   # clientes de API, sessão, utilitários
│   ├── package.json
│   └── eslint.config.mjs
├── mobile/
│   ├── cliente-android/           # submódulo → repo próprio — app Kotlin/Compose do cliente
│   └── vendedor-android/          # submódulo → repo próprio — app Kotlin/Compose do vendedor
├── scripts/
│   ├── bootstrap.ps1              # git submodule update --init --recursive
│   └── set-submodule-urls.ps1     # reescreve as URLs dos submódulos para o host real
├── docker/
│   └── init-db.sql                # cria os quatro bancos
├── docs/
│   ├── arquitetura.md             # visão-alvo (não as-is)
│   ├── padroes-documentacao.md    # padrões editoriais
│   └── tecnica/                   # esta documentação
├── docker-compose.yml             # PostgreSQL 16, Redis 7, Redpanda, Console e init do tópico
├── AGENTS.md                      # instruções para agentes de código
└── README.md                      # porta de entrada (parcialmente histórico)
```

### 1.1 Repositórios e submódulos

**Implementado.** Cada projeto tem histórico, branches, tags e CI próprios. O guarda-chuva não versiona código de aplicação: registra apenas o SHA de cada submódulo, o que torna o ambiente reproduzível.

| Caminho no guarda-chuva | Repositório | Build |
|---|---|---|
| `backend/api-gateway` | `api-gateway` | Maven Wrapper |
| `backend/identity-service` | `identity-service` | Maven Wrapper |
| `backend/tenant-service` | `tenant-service` | Maven Wrapper |
| `backend/catalog-service` | `catalog-service` | Maven Wrapper |
| `backend/order-service` | `order-service` | Maven Wrapper |
| `frontend` | `delivery-web` | npm |
| `mobile/cliente-android` | `cliente-android` | Gradle Wrapper |
| `mobile/vendedor-android` | `vendedor-android` | Gradle Wrapper |

Fluxo ao alterar um projeto:

```powershell
# 1. Trabalhe dentro do submódulo
cd backend\order-service
git switch -c feat/novo-status
# ... alterações ...
git commit -am "feat(order): adiciona status PRONTO_PARA_RETIRADA"
git push -u origin feat/novo-status

# 2. Só depois, no guarda-chuva, registre o novo SHA
cd ..\..
git add backend/order-service
git commit -m "chore(order): atualiza ponteiro para feat/novo-status"
```

Regras:

- **Push no filho antes do commit do ponteiro.** Ponteiro sem push gera clone quebrado.
- Um PR no guarda-chuva que muda submódulo deve linkar os PRs dos filhos.
- Mudança transversal exige plano de merge: compatibilidade para frente e para trás, ou janela coordenada.
- `git submodule update --remote` só quando a intenção é mover todos para o topo das branches — não use por hábito.

### 1.2 Estrutura interna de um serviço

Padrão por camada, repetido nos cinco serviços:

```text
src/main/java/com/delivery/<serviço>/
├── <Serviço>Application.java
├── config/          # Security, JWT, OpenAPI, seeders
├── controller/      # endpoints REST
├── dto/             # request/response
├── model/           # entidades JPA e enums
├── repository/      # Spring Data JPA
├── service/         # regras de negócio
├── mapper/          # conversão entidade ↔ DTO (order)
└── event/           # eventos internos, SSE e producer Kafka (order)
```

```text
src/main/resources/
├── application.yml
└── db/changelog/
    ├── db.changelog-master.yaml
    └── changes/
```

---

## 2. Fluxo de trabalho

### 2.1 Branches

| Item | Estado |
|---|---|
| Política formal | **Planejado** |
| Prática atual | Cada repositório nasce com branch `main`; sem proteção configurada |

Convenção recomendada (GitHub Flow):

```text
main                      # sempre integrável
feat/<tema-curto>         # nova funcionalidade
fix/<tema-curto>          # correção
docs/<tema-curto>         # documentação
chore/<tema-curto>        # infraestrutura, dependências
```

Regras:

- Branches curtas (≤ 5 dias) para reduzir conflito.
- Rebase antes do merge; sem merge commits desnecessários.
- `main` protegida: PR obrigatório, CI verde, uma aprovação.
- No guarda-chuva, use a mesma convenção e cite os PRs dos submódulos.

### 2.2 Commits

Formato recomendado — [Conventional Commits 1.0.0](https://www.conventionalcommits.org/):

```text
<tipo>(<escopo>): <descrição no imperativo>

[corpo opcional]

[rodapé opcional]
```

| Tipo | Uso | Exemplo |
|---|---|---|
| `feat` | Nova funcionalidade | `feat(order): adiciona cancelamento pelo vendedor` |
| `fix` | Correção de defeito | `fix(auth): retorna 401 em credenciais inválidas` |
| `docs` | Documentação | `docs(tecnica): adiciona guia de segurança` |
| `refactor` | Mudança sem alterar comportamento | `refactor(catalog): extrai mapper de prato` |
| `test` | Testes | `test(order): cobre transições de status` |
| `chore` | Build, dependências, infra | `chore(deps): atualiza Spring Boot para 4.1.1` |
| `perf` | Desempenho | `perf(orders): adiciona paginação na listagem` |

Escopos usuais: `gateway`, `identity`, `tenant`, `catalog`, `order`, `web`, `android`, `db`, `docs`, `infra`.

Boas práticas:

- Um commit = uma intenção. Não misture refatoração com correção.
- Descreva o **porquê** no corpo quando o diff não for óbvio.
- Referencie a issue: `Closes #42`.
- Não commite segredos, `target/`, `node_modules/` ou `.env.local`.

### 2.3 Pull request

Template recomendado:

```markdown
## O que muda
<!-- Uma frase objetiva -->

## Por quê
<!-- Problema, issue ou requisito -->

## Como testar
1.
2.

## Checklist
- [ ] Testes adicionados/atualizados
- [ ] Documentação atualizada
- [ ] Sem segredos ou dados pessoais no diff
- [ ] Migration Liquibase (se aplicável)
- [ ] Contrato de API verificado (se aplicável)

## Evidências
<!-- Prints, logs ou respostas de API -->
```

Tamanho alvo: ≤ 400 linhas alteradas. PRs maiores devem ser divididos ou justificados.

---

## 3. Convenções do backend

### 3.1 Linguagem e versão

| Item | Valor |
|---|---|
| Java | 21 (backend) |
| Spring Boot | 4.1.1 |
| Spring Cloud | 2025.1.3 |
| Build | Maven Wrapper |
| Empacotamento | Um jar executável por serviço |

### 3.2 Estilo

O código segue, na prática, o [Google Java Style](https://google.github.io/styleguide/javaguide.html) com ajustes:

- 4 espaços de indentação.
- Classes em `PascalCase`; métodos e variáveis em `camelCase`; constantes em `UPPER_SNAKE_CASE`.
- Injeção por construtor via `@RequiredArgsConstructor` (Lombok).
- `record` ainda não é usado; DTOs são classes com `@Data`.
- Sem `@Autowired` em campo.
- `BigDecimal` para dinheiro; nunca `double`.
- `UUID` como identificador público.
- `LocalDateTime`/`Instant` para tempo; sem `java.util.Date`.

> **Divergente:** não há formatador automático configurado (Spotless, Checkstyle). A consistência depende de revisão manual.

### 3.3 Camadas

| Camada | Responsabilidade | Proibido |
|---|---|---|
| `controller` | HTTP, validação de entrada, códigos de status | Regra de negócio, acesso a repository |
| `service` | Regra de negócio, transação | Detalhe HTTP (`ResponseEntity`) |
| `repository` | Persistência | Regra de negócio |
| `model` | Entidade JPA | DTO de API |
| `dto` | Contrato externo | Entidade JPA exposta diretamente |

**Dívida conhecida:** `TenantController` e `OrderController` retornam entidades JPA diretamente. Isso acopla o contrato ao schema e expõe campos internos (ver [`06-seguranca.md`](06-seguranca.md#l6--dados-de-loja-e-proprietário-expostos-publicamente-alta)). Novos endpoints devem usar DTOs.

### 3.4 Tratamento de erros

| Situação | Padrão atual | Padrão recomendado |
|---|---|---|
| Recurso não encontrado | `ResponseStatusException(NOT_FOUND)` ou `RuntimeException` | `ResponseStatusException` ou `@ControllerAdvice` |
| Regra de negócio | `ResponseStatusException(BAD_REQUEST/CONFLICT)` | Exceção de domínio + handler |
| Credencial inválida | `RuntimeException` → 500 | `401` via `AuthenticationException` |
| Validação de bean | `400` automático do Spring | Manter e padronizar corpo |
| Erro inesperado | `500` com stack trace no log | `500` com `traceId`, sem detalhe interno |

Não há `@ControllerAdvice` global. Cada serviço responde em formato próprio. Os clientes compensam com normalização em [`apiClient.ts`](../../frontend/src/lib/apiClient.ts).

### 3.5 Validação

- Use `jakarta.validation` nos DTOs de entrada (`@NotBlank`, `@Email`, `@Size`, `@NotNull`).
- Anote o parâmetro do controller com `@Valid`.
- Valide regras de negócio no service, não no controller.
- Mensagens em português, voltadas ao usuário final.

### 3.6 Logs

| Regra | Detalhe |
|---|---|
| Logger | `@Slf4j` (Lombok) |
| Nível | `INFO` para eventos de negócio; `WARN` para degradação; `ERROR` para falha |
| Proibido | Senhas, tokens, códigos de reset e PII completa |
| Formato | Texto livre hoje; JSON é **Planejado** |
| Configuração | `logging.level` em `application.yml` |

**Atenção:** os `application.yml` atuais habilitam `org.springframework.web: DEBUG` e `org.hibernate.type.descriptor.sql.BasicBinder: TRACE`, o que registra parâmetros SQL com dados pessoais. Reduza para `INFO` fora de desenvolvimento.

### 3.7 Dependências

- Versões gerenciadas pelo BOM do Spring Boot; não fixe versões sem necessidade.
- `springdoc` é a exceção versionada explicitamente (`3.2.0`).
- Novas dependências exigem justificativa no PR (licença, manutenção, tamanho).
- Não adicione dependências de mensageria sem um caso de uso claro — `spring-kafka` só existe no `order-service`, onde há producer de eventos.

---

## 4. Convenções do frontend

### 4.1 Stack e configuração

| Item | Valor |
|---|---|
| Framework | Next.js 16.4.2 (App Router) |
| React | 19.3.0 |
| Linguagem | TypeScript 5, `strict: true` |
| Estilo | Tailwind CSS 4 |
| Lint | ESLint 9 + `eslint-config-next` |
| Alias | `@/*` → `src/*` |
| Estado | Hooks locais e `localStorage`; sem biblioteca global |

> **Importante:** esta versão do Next.js difere materialmente das anteriores. Antes de alterar configuração, rotas ou APIs, consulte `frontend/node_modules/next/dist/docs/` (regra registrada em [`frontend/AGENTS.md`](../../frontend/AGENTS.md)).

### 4.2 Organização

| Pasta | Conteúdo |
|---|---|
| `src/app/` | Rotas e layouts (Server/Client Components) |
| `src/components/` | Componentes reutilizáveis |
| `src/lib/` | Clientes HTTP, sessão, utilitários |

Regras:

- Um diretório por rota; `page.tsx` é o ponto de entrada.
- Componentes que usam browser API levam `'use client'`.
- Não faça `fetch` direto em componentes: use `apiRequest` de `src/lib/apiClient.ts`.
- Centralize a URL base em `src/lib/apiBaseUrl.ts`.
- Toda chamada administrativa passa por `adminApi.ts`, que anexa o token.
- Erros devem ser exibidos com `getApiErrorFeedback`, preservando a distinção `warning`/`error`.

### 4.3 Estilo de código

- Componentes em `PascalCase`; hooks em `useXxx`.
- Arquivos de componente em `PascalCase.tsx`; utilitários em `camelCase.ts`.
- Prefira funções puras e tipos explícitos nas fronteiras de API.
- Evite `any`; o projeto usa `unknown` + narrowing em `apiClient.ts` como referência.
- Classes CSS via Tailwind; sem CSS global novo sem necessidade.
- Textos de interface em português (pt-BR).

### 4.4 Acessibilidade e responsividade

- Todo controle interativo deve ser alcançável por teclado.
- Imagens com `alt` significativo.
- Contraste mínimo AA (WCAG 2.2).
- Layout funcional em 360 px, 768 px e 1280 px.

---

## 5. Convenções do Android

| Item | Valor |
|---|---|
| Linguagem | Kotlin 2.0.20 |
| UI | Jetpack Compose (BOM 2024.09.00) |
| minSdk / targetSdk | 26 / 35 |
| JVM | 17 |
| HTTP | Retrofit 2.11 + OkHttp 4.12 + Moshi |
| Tempo real | OkHttp SSE (`okhttp-sse`) em `OrderEventsRepository` |
| Agenda | `AgendaScreen` + `GET /api/orders/tenant/{tenantId}/agenda` (polling de 30 s) |
| Sessão | `EncryptedSharedPreferences` |
| Base URL debug | `http://10.0.2.2:8080/api/` |

Regras:

- ViewModels expõem estado observável ao Compose com `mutableStateOf`/`mutableStateListOf`; a UI lê o estado diretamente. `StateFlow`/`collectAsStateWithLifecycle` é o alvo para novas telas.
- Chamadas de rede em `Dispatchers.IO`, nunca na main thread.
- O token é anexado por interceptor; não repita o header em cada chamada.
- Não logue corpo de requisição em release (`logging-interceptor` apenas em debug).
- `usesCleartextTraffic` só em debug; release exige HTTPS.
- Novas telas devem ter `preview` e conteúdo de teste.
- O stream SSE segue o ciclo de vida do app: abre após o login, fecha ao sair e reconecta com backoff exponencial. Ao reconectar, recarregue a fila para cobrir eventos perdidos.
- Alertas de novo pedido usam vibração e som; não dispare notificação para pedidos de balcão criados pelo próprio vendedor.
- A aba Agenda usa o endpoint público sanitizado, respeita o dia selecionado e atualiza a cada 30 s enquanto visível. Ações na fila recarregam a agenda em silêncio quando ela já foi carregada.

---

## 6. Convenções de banco de dados

### 6.1 Regras

| Regra | Motivo |
|---|---|
| `ddl-auto: validate` sempre | O schema é definido por Liquibase, não pelo Hibernate |
| Toda alteração via changeset | Reprodutibilidade entre ambientes |
| Changeset imutável após merge | Checksum do Liquibase quebra |
| Um changeset por intenção | Rollback e leitura mais simples |
| `id` como `UUID` | Consistência entre serviços |
| `created_at`/`updated_at` em entidades mutáveis | Auditoria mínima |
| Nomes em `snake_case` no banco | Convenção SQL |
| Índices para FKs e filtros frequentes | Desempenho |
| Sem `DROP` sem plano de migração de dados | Evita perda |

### 6.2 Formato do changeset

```yaml
databaseChangeLog:
  - changeSet:
      id: 2026-10-26-01-add-order-notes
      author: equipe
      changes:
        - addColumn:
            tableName: orders
            columns:
              - column:
                  name: notes
                  type: varchar(500)
      rollback:
        - dropColumn:
            tableName: orders
            columnName: notes
```

Checklist de migration:

- [ ] `id` único e descritivo (data + sequência).
- [ ] `author` preenchido.
- [ ] `rollback` explícito quando possível.
- [ ] Testada em banco vazio **e** em banco com dados.
- [ ] Compatível com a versão anterior da aplicação (deploy sem downtime).
- [ ] Documentada em [`04-dados.md`](04-dados.md) se alterar o modelo conceitual.

### 6.3 Seeders

| Seeder | Condição | Observação |
|---|---|---|
| `DataSeeder` (identity/tenant/catalog) | `app.seed.demo-data=true` | Desligado por padrão |
| `StoreDataSeeder` (tenant) | Sempre | Idempotente |
| `OrderDataSeeder` (order) | Sempre | Depende do tenant-service |

Novos seeders devem ser condicionais (`@ConditionalOnProperty`) e idempotentes. Seed em produção é **proibido**.

---

## 7. Documentação como código

### 7.1 O que atualizar em cada mudança

| Mudança | Documento |
|---|---|
| Novo endpoint ou campo | [`03-api.md`](03-api.md) + OpenAPI gerado |
| Nova tabela, coluna ou índice | [`04-dados.md`](04-dados.md) + changeset |
| Novo serviço, fila ou dependência de runtime | [`02-arquitetura.md`](02-arquitetura.md) |
| Nova variável de ambiente ou porta | [`05-operacao.md`](05-operacao.md) |
| Mudança em autenticação/autorização | [`06-seguranca.md`](06-seguranca.md) |
| Novo teste ou portão de CI | [`07-qualidade-e-testes.md`](07-qualidade-e-testes.md) |
| Decisão estrutural | ADR em [`09-decisoes/`](09-decisoes/README.md) |
| Mudança de status de funcionalidade | [`01-visao-geral.md`](01-visao-geral.md) e hub |

### 7.2 Regras editoriais

Definidas em [`../padroes-documentacao.md`](../padroes-documentacao.md). Resumo:

- Português (pt-BR), voz ativa, frases curtas.
- Um assunto por documento; títulos hierárquicos sem pular níveis.
- Todo código em bloco com linguagem declarada.
- Links relativos para arquivos internos; absolutos para fontes externas.
- Status explícito: **Implementado**, **Parcial**, **Planejado**, **Divergente** ou **Legado**.
- Sem segredos, tokens ou dados pessoais reais em exemplos.
- Data de revisão atualizada no cabeçalho.

### 7.3 Processo de ADR

1. Copie [`_templates/adr.md`](_templates/adr.md).
2. Numere sequencialmente (`0009-...`).
3. Preencha contexto, decisão, alternativas e consequências.
4. Abra o PR junto com a mudança que motivou a decisão.
5. Status: `Proposto` → `Aceito` → `Substituído por NNNN` / `Obsoleto`.
6. Nunca reescreva um ADR aceito; crie outro e referencie o anterior.
7. Atualize o índice em [`09-decisoes/README.md`](09-decisoes/README.md).

### 7.4 Linguagem ubíqua

| Termo | Significado no projeto |
|---|---|
| **Tenant** | Loja/restaurante; unidade de isolamento |
| **Slug** | Identificador legível da loja na URL (`pizzaria-do-joao`) |
| **Prato** | Item de catálogo (`Dish`) |
| **Pedido** | `Order`, com itens e status |
| **Pedido de balcão** | Pedido presencial, sem entrega |
| **Entregador** | `Courier` |
| **Proposta de pagamento** | Estado efêmero de mudança de métodos; hoje só em memória |
| **Sessão** | Token JWT + dados do usuário no cliente |

Evite sinônimos: use “loja” ou “tenant”, não “estabelecimento”, “restaurante” e “vendor” aleatoriamente.

---

## 8. Processo de mudança de API

O projeto **não** pratica contract-first: o OpenAPI é gerado a partir do código pelo springdoc. Isso torna o contrato um subproduto, não uma especificação.

### 8.1 Regras

| Tipo de mudança | Compatível? | Procedimento |
|---|---|---|
| Adicionar campo opcional na resposta | Sim | Atualizar `03-api.md` e clientes |
| Adicionar campo obrigatório na requisição | **Não** | Nova versão ou período de transição |
| Remover campo | **Não** | Deprecar, anunciar, remover depois |
| Renomear campo | **Não** | Manter ambos temporariamente |
| Alterar tipo | **Não** | Novo campo + migração |
| Novo endpoint | Sim | Documentar e testar autorização |
| Alterar código de status | **Não** | Tratar como breaking change |
| Alterar semântica de erro | **Não** | Documentar e versionar mensagem |

### 8.2 Versionamento

Não há versionamento de API (`/v1`). A recomendação é introduzir `/api/v1/**` antes do primeiro consumidor externo. Enquanto isso:

- Mudanças breaking exigem coordenação entre backend, web e Android no mesmo release.
- O Android instalado em dispositivos não é atualizável instantaneamente: mantenha compatibilidade retroativa por pelo menos uma versão.

### 8.3 Checklist de mudança de contrato

- [ ] `springdoc` gera o schema atualizado.
- [ ] `03-api.md` reflete o novo contrato.
- [ ] Clientes web e Android foram ajustados ou a compatibilidade foi preservada.
- [ ] Teste de contrato cobre o campo.
- [ ] Códigos de erro documentados.
- [ ] Autorização do endpoint definida e testada.

---

## 9. Checklist de PR

### Backend

- [ ] `mvn -pl <módulo> test` passa.
- [ ] Novo endpoint tem DTO, validação e teste.
- [ ] Autorização aplicada no gateway **e** no serviço (quando existir).
- [ ] Nenhuma entidade JPA nova exposta diretamente.
- [ ] Migration Liquibase com `rollback`.
- [ ] Logs sem PII.
- [ ] `03-api.md` e `04-dados.md` atualizados.

### Frontend

- [ ] `npm run lint` sem erros.
- [ ] `npm run build` sem erros.
- [ ] Chamadas via `apiClient`/`adminApi`.
- [ ] Estados de loading, vazio e erro tratados.
- [ ] Responsivo em 360 px e desktop.
- [ ] Acessível por teclado.

### Android

- [ ] `gradlew assembleDebug` passa.
- [ ] Sem `Log` de token ou corpo sensível.
- [ ] Base URL correta por build type.
- [ ] Estados de erro e reconexão SSE tratados.

### Documentação e segurança

- [ ] Documento afetado atualizado no mesmo PR.
- [ ] ADR criado se a decisão for estrutural.
- [ ] Nenhum segredo, token ou dado pessoal no diff.
- [ ] Links relativos válidos.
- [ ] Data de revisão atualizada.

---

## 10. Revisão de código

O revisor deve priorizar, nesta ordem:

1. **Correção** — a mudança faz o que promete? Cobre casos de borda?
2. **Segurança** — autorização, isolamento de tenant, exposição de dados.
3. **Contrato** — a API quebrou algum cliente?
4. **Dados** — a migration é segura e reversível?
5. **Testes** — há teste que falharia sem a mudança?
6. **Legibilidade** — nomes, coesão, duplicação.
7. **Documentação** — está atualizada?

Comentários devem ser específicos e acionáveis. Prefira sugerir uma alteração a apenas apontar um problema. Aprovação implica responsabilidade compartilhada pela mudança.

---

## 11. Changelog e releases

| Item | Estado |
|---|---|
| `CHANGELOG.md` | **Planejado** |
| Versionamento semântico | **Parcial** — serviços em `0.0.1-SNAPSHOT`, web `0.1.0`, Android `0.1.0` |
| Tags | Não observadas |
| Release automatizado | **Planejado** |

Formato recomendado — [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/):

```markdown
## [Não lançado]

### Adicionado
- Endpoint de cancelamento de pedido pelo vendedor.

### Corrigido
- `POST /api/auth/login` retorna 401 em credenciais inválidas.

### Alterado
- Listagem de pedidos agora é paginada.
```

---

## 12. Ambiente de desenvolvimento

O guarda-chuva funciona como kit de onboarding: um clone recursivo, um `.env` e um comando.

```powershell
# 1. Código e variáveis
git clone --recurse-submodules <url> delivery-marketplace
cd delivery-marketplace
Copy-Item .env.example .env

# 2a. Tudo em containers (infra + serviços + frontend)
.\scripts\dev.ps1 up

# 2b. Ou só a infraestrutura, com as apps nativas (dia a dia)
.\scripts\dev.ps1 infra

# 3. Backend nativo (terminais separados), se escolheu 2a
cd backend\identity-service
.\mvnw.cmd spring-boot:run

# 4. Frontend nativo
cd frontend
npm run dev

# 5. Android
cd mobile\vendedor-android
.\gradlew.bat installDebug
```

Cada serviço e o frontend têm `Dockerfile` multi-stage próprio, versionado no respectivo repositório. O `docker-compose.yml` do guarda-chuva apenas referencia esses contextos.

Detalhes, ordem de subida e troubleshooting em [`05-operacao.md`](05-operacao.md).

---

## 13. Referências

| Tema | Fonte |
|---|---|
| Commits | [Conventional Commits 1.0.0](https://www.conventionalcommits.org/pt-br/v1.0.0/) |
| Versionamento | [Semantic Versioning 2.0.0](https://semver.org/lang/pt-BR/) |
| Changelog | [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) |
| Branches | [GitHub Flow](https://docs.github.com/get-started/using-github/github-flow) |
| Estilo Java | [Google Java Style Guide](https://google.github.io/styleguide/javaguide.html) |
| Revisão | [Google Engineering Practices — Code Review](https://google.github.io/eng-practices/review/) |
| ADR | [MADR 4.0](https://adr.github.io/madr/) |
| Spring Boot | [Spring Boot Reference](https://docs.spring.io/spring-boot/reference/) |
| Next.js | [Next.js Documentation](https://nextjs.org/docs) |
| Android | [Android Developers — Architecture](https://developer.android.com/topic/architecture) |
| Acessibilidade | [WCAG 2.2](https://www.w3.org/TR/WCAG22/) |

---

## 14. Documentos relacionados

- [`01-visao-geral.md`](01-visao-geral.md) — escopo funcional
- [`02-arquitetura.md`](02-arquitetura.md) — decisões estruturais
- [`03-api.md`](03-api.md) — contratos HTTP
- [`04-dados.md`](04-dados.md) — schema e migrações
- [`05-operacao.md`](05-operacao.md) — ambiente local
- [`06-seguranca.md`](06-seguranca.md) — requisitos de segurança
- [`07-qualidade-e-testes.md`](07-qualidade-e-testes.md) — estratégia de testes
- [`09-decisoes/README.md`](09-decisoes/README.md) — índice de ADRs
- [`../padroes-documentacao.md`](../padroes-documentacao.md) — padrões editoriais
