# 0016 — App cliente multi-loja com vínculo da loja pelo link

| Campo | Valor |
|---|---|
| Status | Aceito |
| Data de registro | 2026-10-28 |
| Decisores | Equipe de engenharia |
| Impacto | Identidade, app cliente Android, tenant-service, operação |
| Substitui | — |
| Substituído por | — |

## Contexto e problema

O app Android do cliente nasceu como **white-label**: cada loja gerava um APK com o próprio `STORE_SLUG` e `STORE_NAME`, e a loja era uma constante do build (`BuildConfig.STORE_SLUG`). Isso tem três consequências ruins:

- publicar uma loja nova exige gerar, assinar e distribuir outro APK;
- um cliente que pede em duas lojas precisa de dois apps e de duas contas;
- listar pedidos de lojas diferentes na mesma tela é impossível, porque o app só conhece uma loja.

A operação quer o contrário: **um único app**, login obrigatório, e a loja entrando na conta do cliente conforme ele abre o link do estabelecimento. Com uma loja vinculada, o cardápio abre direto; com duas ou mais, o app mostra a lista inicial de estabelecimentos.

> Como um cliente pode acumular lojas na mesma conta, sem que o app carregue a loja no build e sem confiar no cliente para dizer qual loja ele está acessando?

## Forças de decisão

- **F1** — Um único APK deve atender qualquer loja do ambiente.
- **F2** — O vínculo cliente↔loja precisa existir no servidor, para sobreviver à troca de aparelho e não duplicar.
- **F3** — O link é o canal de entrada: `deliveryhub://loja/{slug}` (app) e `https://.../loja/{slug}` (web).
- **F4** — Loja inexistente não pode entrar na lista; o cliente precisa de uma mensagem clara.
- **F5** — O app já exige `ROLE_CUSTOMER` e o gateway já protege `/api/customers/**`; o vínculo deve reaproveitar essa fronteira.
- **F6** — O cartão, o endereço e o perfil do cliente já vivem no `identity-service`; a lista de lojas pertence ao mesmo contexto de conta.
- **F7** — O `tenant-service` é o dono do diretório de lojas e do tema; validar o slug sem consultá-lo permitiria loja fantasma.
- **F8** — O histórico de pedidos é do `order-service` e não tem `tenant_id` como filtro obrigatório do cliente; a lista inicial não pode depender dele.

## Opções consideradas

### Opção 1 — Manter o APK white-label e adicionar um seletor de lojas

Continuar gerando um APK por loja e permitir trocar de loja dentro do app por uma lista fixa de slugs.

**Prós**

- Nenhuma mudança de backend.
- A marca da loja continua sendo a do APK.

**Contras**

- Não resolve o problema de distribuição (um APK por loja).
- A lista de lojas continuaria no build ou dependeria de `GET /api/tenants`, que expõe todas as lojas do ambiente.
- Não registra que o cliente pertence àquela loja.

### Opção 2 — Vínculo no `order-service`, junto dos pedidos

Guardar as lojas do cliente ao lado dos pedidos, já que o pedido tem `tenantId`.

**Prós**

- Um serviço a menos para consultar durante o checkout.

**Contras**

- O `order-service` não tem segurança própria e é público no gateway; criar dado de conta ali amplia a superfície.
- O vínculo existiria mesmo sem pedido, o que não é responsabilidade do serviço de pedidos.
- Duplicaria o conceito de conta, que já está no identity.

### Opção 3 — Vínculo no `identity-service`, validado no `tenant-service` (escolhida)

Criar `customer_stores` no `identity_db`, exposto em `/api/customers/me/stores` (`GET`, `POST`, `DELETE`). O `POST` recebe o slug (ou a URL), normaliza, valida em `GET /api/tenants/{slug}/theme` e grava o vínculo. O app resolve o link, chama o `POST` e recarrega o tema ao vivo.

**Prós**

- Um APK para todas as lojas; a loja é dado da conta, não do binário.
- O vínculo herda o `ROLE_CUSTOMER` e o `userId` do JWT, sem novo modelo de autorização.
- A validação no tenant-service impede loja inexistente e mantém o diretório em um dono só.
- `GET` devolve o retrato (`name`, `logoUrl`) e o app complementa com o tema ao vivo.

**Contras**

- O `identity-service` passa a depender do `tenant-service` em runtime (antes só o order e o catalog dependiam).
- Duplica nome e logo no vínculo: se a loja mudar de nome, o retrato fica velho até o tema ser recarregado.
- Um campo a mais para manter no schema (`tenant_id`, `name`, `logo_url`).

## Decisão

**Escolhemos a opção 3.**

Contrato implementado em [`CustomerStoreController`](../../../backend/identity-service/src/main/java/com/delivery/identity/controller/CustomerStoreController.java):

| Método | Caminho | Efeito |
|---|---|---|
| `GET` | `/api/customers/me/stores` | Lista as lojas do cliente, na ordem em que foram vinculadas |
| `POST` | `/api/customers/me/stores` | Valida o slug e cria o vínculo; idempotente |
| `DELETE` | `/api/customers/me/stores/{slug}` | Remove o vínculo |

Regras implementadas em [`CustomerStoreService`](../../../backend/identity-service/src/main/java/com/delivery/identity/service/CustomerStoreService.java):

- normaliza `slug`, `deliveryhub://loja/{slug}` e `https://.../loja/{slug}` para `[a-z0-9][a-z0-9_-]{0,59}`;
- valida o slug em `GET /api/tenants/{slug}/theme` via [`TenantStoreLookup`](../../../backend/identity-service/src/main/java/com/delivery/identity/service/TenantStoreLookup.java) (timeout 2 s/3 s; `404` → loja inexistente; indisponível → `503`);
- `POST` é idempotente pelo índice único `(user_id, slug)` da migration [`006-customer-stores.sql`](../../../backend/identity-service/src/main/resources/db/changelog/changes/006-customer-stores.sql);
- limite de 50 lojas por cliente (`409`);
- remove o vínculo em `DELETE`, sem apagar pedidos.

No app cliente:

- `MainActivity` declara `launchMode="singleTop"`, trata `onCreate`/`onNewIntent` e entrega o link por `MutableSharedFlow<StoreLinkEvent>` com `replay = 1`; o `nonce` evita reabrir a loja em rotação e permite reabrir o mesmo link tocado de novo;
- sem sessão, o tema público da loja vira o hero do login e o slug fica pendente (`pendingLinkSlug`); o vínculo é criado logo após o login;
- com **uma** loja o cardápio abre direto; com **duas ou mais** a aba **Lojas** mostra a lista;
- trocar de loja limpa o carrinho, com aviso;
- o histórico de pedidos continua global e passa a exibir o nome da loja no card e na comanda;
- `STORE_SLUG`/`STORE_NAME` saem do `build.gradle.kts`; `APP_NAME` vira apenas o rótulo do app e da tela de login sem loja vinculada.

## Consequências

### Positivas

- Um APK serve qualquer loja; publicar uma loja nova não exige build.
- O cliente mantém uma conta e várias lojas, com a lista sincronizada pelo servidor.
- Loja inexistente é rejeitada no servidor, não no cliente.
- O vínculo reaproveita `ROLE_CUSTOMER` e o `sub` do JWT.
- A loja dona do link passa a ter registro de quem abriu o app por ela (`customer_stores.tenant_id`).

### Negativas

- **Nova dependência em runtime.** Com o `tenant-service` fora do ar, vincular loja retorna `503`. O `docker-compose` injeta `SERVICES_TENANT_URL` no identity, mas não há retry nem circuit breaker.
- **Dado replicado.** `name` e `logoUrl` podem ficar defasados em relação ao tenant; a lista mostra o tema ao vivo quando disponível.
- **Sem convite.** Qualquer cliente pode adicionar qualquer loja ativa se souber o slug; o link não é assinado (lacuna 31 em [`../03-api.md`](../03-api.md#11-lacunas-conhecidas-do-contrato)).
- **Lista de clientes da loja não exposta.** O dado existe e é indexado por `tenant_id`, mas nenhum endpoint do vendedor o consulta (lacuna 30).
- **Migração obrigatória.** Bancos existentes precisam do changeset `006` antes de subir o identity (`ddl-auto: validate`).
- **Carrinho de uma loja por vez.** O carrinho não é multiloja; trocar de loja descarta os itens.

### Neutras

- O app continua sem mapa do entregador; o rastreamento segue **Planejado** (lacuna 29).
- A web do cliente continua por slug (`/loja/{slug}`) e sem login; o vínculo é exclusivo do app.
- O build `debug` mantém o atalho com `GET /api/tenants` para validar sem link; o `release` não expõe.

## Riscos e mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| `tenant-service` indisponível impede vincular loja | Média | Médio | Timeout curto, `503` com mensagem legível e nova tentativa pelo diálogo |
| Loja fantasma entrar na lista | Baixa | Alto | Validação server-side em `/theme` antes do `INSERT` |
| Vínculo duplicado por toque repetido no link | Baixa | Baixo | Índice único `(user_id, slug)` e `POST` idempotente |
| Cliente adiciona loja sem convite | Média | Baixo | Registrar como lacuna; assinatura/expiração do link no roadmap |
| Vínculo usado para inferir relação cliente↔loja | Média | Médio | Acesso restrito ao próprio cliente; endpoint da loja exigirá consentimento (LGPD) |
| App reabrir a loja em rotação | Média | Baixo | `StoreLinkEvent.nonce` + `rememberSaveable` no `ClienteApp` |

## Confirmação

- `POST /api/customers/me/stores` com o mesmo slug duas vezes cria **um** registro e retorna `200` nas duas.
- `POST` com slug inexistente retorna `404` e não grava nada; com o tenant fora do ar retorna `503`.
- `GET /api/customers/me/stores` sem token retorna `401`; com token de vendedor retorna `403`.
- `adb shell am start -a android.intent.action.VIEW -d "deliveryhub://loja/vera-marmitex" com.deliveryplatform.cliente` abre a loja; repetir com o app aberto entra por `onNewIntent`.
- Cliente com uma loja vinculada cai no cardápio; com duas, na lista.
- `gradlew :app:assembleDebug` passa sem `STORE_SLUG` no `build.gradle.kts`.

## Mais informações

- [`../01-visao-geral.md`](../01-visao-geral.md) — jornada do cliente e matriz de capacidades
- [`../02-arquitetura.md`](../02-arquitetura.md#610-estabelecimentos-do-cliente-pelo-link-da-loja) — fluxo entre app, gateway, identity e tenant
- [`../03-api.md`](../03-api.md#38-cliente--estabelecimentos-apicustomersmestores) — contrato dos endpoints
- [`../04-dados.md`](../04-dados.md#31-identity) — tabela `customer_stores`
- [`../05-operacao.md`](../05-operacao.md#36-android) — build do app e teste do deep link
- [`../06-seguranca.md`](../06-seguranca.md#42-matriz-de-autorização-por-endpoint) — autorização de `/api/customers/**`
- [`../../../mobile/cliente-android/README.md`](../../../mobile/cliente-android/README.md) — visão do app cliente
