# 0010 — Cadastro de usuários por perfil e vínculo com loja

| Campo | Valor |
|---|---|
| Status | Aceito |
| Data de registro | 2026-10-26 |
| Decisores | Equipe de engenharia |
| Impacto | Identidade, autorização, painel administrativo |
| Substitui | — |
| Substituído por | — |

## Contexto e problema

O cadastro público (`POST /api/auth/register`) aceitava `SELLER`, `COURIER` e `CUSTOMER` com `tenantId` livre no corpo. Qualquer pessoa podia se declarar vendedor de uma loja existente sem aprovação, e o painel não tinha uma tela única para criar ou corrigir contas. O resultado prático: contas nascidas com o perfil errado, vendedores sem loja, entregadores sem vínculo e administradores sem como desativar um acesso.

O painel já tinha rotas administrativas (`/api/auth/admin/team`, `seller-link`), mas elas cobriam apenas casos isolados. Não havia edição de perfil, troca de senha, desativação, nem um perfil operacional intermediário entre `ADMIN` e `SELLER`.

> Como permitir que a operação crie e mantenha contas de todos os perfis, com vínculo de loja explícito e sem transformar o cadastro público em porta de entrada para privilégio?

## Forças de decisão

- **F1** — O cliente precisa se cadastrar sozinho para comprar; ninguém mais deve ganhar privilégio sem intervenção administrativa.
- **F2** — `SELLER` só faz sentido vinculado a uma loja; `ADMIN` e `SUPPORT` são contas da plataforma e não pertencem a loja.
- **F3** — A operação precisa desativar acessos sem apagar histórico de pedidos e auditoria.
- **F4** — O suporte precisa consultar usuários para identificar entregadores, mas não deve gerir acessos nem configurações.
- **F5** — O identity não pode consultar o tenant-service em toda escrita sem acoplar os serviços.
- **F6** — O sistema não pode ficar sem administrador ativo por acidente.
- **F7** — Os erros precisam chegar ao painel com motivo legível, não como corpo genérico do Spring.

## Opções consideradas

### Opção 1 — Manter o cadastro público aberto e validar depois

Continuar aceitando todos os perfis e corrigir os vínculos manualmente no banco.

**Prós**

- Nenhuma mudança de contrato.
- Cadastro de vendedor e entregador sem passar pelo painel.

**Contras**

- Mantém a auto-atribuição de `SELLER`, que é falha de autorização.
- Não resolve a falta de tela de manutenção.
- Depende de acesso direto ao banco para corrigir dados.

### Opção 2 — Cadastro público só de `CUSTOMER` e gestão central no painel (escolhida)

O registro público cria apenas `CUSTOMER`. Todos os demais perfis são criados e editados em `/api/auth/admin/users`, com perfil, loja, senha inicial e situação.

**Prós**

- Fecha a auto-atribuição de privilégio.
- Uma única tela e um único contrato para criar, editar e desativar.
- Permite regras por perfil no serviço, sem depender do cliente.
- Desativação preserva o usuário e o histórico.

**Contras**

- O vendedor depende de um administrador para existir.
- O identity continua sem validar se o `tenantId` existe.
- A desativação não revoga token já emitido.

### Opção 3 — Provisionamento por convite com aprovação da loja

O vendedor se cadastra e a loja aprova o vínculo antes do primeiro acesso.

**Prós**

- Fluxo mais próximo de autoatendimento com controle.
- Não exige administrador da plataforma para cada vendedor.

**Contras**

- Exige estado de convite, expiração e nova tela.
- Ainda precisa de uma tela administrativa para os demais perfis.
- Aumenta o escopo antes de existir operação real.

## Decisão

**Escolhemos a opção 2.**

O cadastro público passa a criar somente `CUSTOMER` e a ignorar `tenantId`. A gestão de todos os perfis fica em três endpoints administrativos:

| Método | Caminho | Efeito |
|---|---|---|
| `POST` | `/api/auth/admin/users` | Cria usuário com `role`, `tenantId`, senha e `active` |
| `PUT` | `/api/auth/admin/users/{id}` | Edita dados, perfil, loja, situação e, opcionalmente, a senha |
| `PATCH` | `/api/auth/admin/users/{id}/status` | Ativa ou desativa |

Regras implementadas em [`AuthService`](../../../backend/identity-service/src/main/java/com/delivery/identity/service/AuthService.java):

| Perfil | `tenantId` |
|---|---|
| `ADMIN` | Proibido |
| `SUPPORT` | Proibido |
| `SELLER` | Obrigatório |
| `COURIER` | Opcional |
| `CUSTOMER` | Opcional (público grava `null`) |

Outras decisões associadas:

- `Role` ganhou `SUPPORT`; a constraint `users_role_check` foi recriada pelo changeset [`004-add-support-role.sql`](../../../backend/identity-service/src/main/resources/db/changelog/changes/004-add-support-role.sql).
- `users.active` foi adicionado pelo changeset [`003-add-user-active.sql`](../../../backend/identity-service/src/main/resources/db/changelog/changes/003-add-user-active.sql); login de conta inativa retorna `403`.
- O último `ADMIN` ativo não pode ser desativado, rebaixado nem removido; o administrador logado não pode remover o próprio acesso (`409`).
- Senha inicial e troca de senha exigem 8 caracteres; o cadastro público mantém apenas `@NotBlank`.
- `SUPPORT` acessa o painel, vê pedidos/lojas/entregadores e consulta `GET /api/auth/users`, mas não acessa `/api/auth/admin/**` nem “Usuários”/“Configurações”.
- [`ApiExceptionHandler`](../../../backend/identity-service/src/main/java/com/delivery/identity/config/ApiExceptionHandler.java) devolve `message`/`detail` e `errors[]`.
- A tela central é [`/admin/usuarios`](../../../frontend/src/app/admin/usuarios/page.tsx), com filtros, situação e formulário de criação/edição.

## Consequências

### Positivas

- Nenhum perfil privilegiado nasce de cadastro público.
- A operação resolve criação, correção de perfil, troca de senha e desativação sem tocar no banco.
- O vínculo de loja fica explícito e validado no serviço.
- `SUPPORT` cobre a operação sem ampliar o poder de escrita.
- Erros de identidade chegam ao painel com causa legível.
- A desativação preserva histórico e auditoria.

### Negativas

- **Dependência do administrador.** Vendedor e entregador não conseguem se cadastrar sozinhos.
- **Loja não validada.** O identity aceita qualquer UUID; um `tenantId` inexistente só falha quando outro serviço tenta usá-lo.
- **Token sobrevive à desativação.** A conta desativada continua operando até o token expirar (60 min).
- **Perfil no token.** Mudar o perfil de um usuário não altera tokens já emitidos; a mudança só vale no próximo login.
- **Migração obrigatória.** Bancos antigos precisam do changeset `004` para aceitar `SUPPORT`.

### Neutras

- `POST /api/auth/admin/team` e `POST /api/auth/admin/users/{id}/seller-link` continuam existindo como atalhos legados.
- A auditoria registra `USUARIO_CRIADO`, `USUARIO_ATUALIZADO`, `USUARIO_ATIVADO` e `USUARIO_DESATIVADO`.
- A lista de usuários não é paginada.

## Riscos e mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| `tenantId` inexistente aceito | Média | Médio | Validar no tenant-service ou em job de consistência |
| Token de conta desativada segue válido | Alta | Médio | Lista de revogação, token curto ou checagem por requisição |
| Admin se tranca fora | Baixa | Alto | Guardas de último admin e auto-acesso já implementadas |
| Painel cria perfil errado | Média | Baixo | Rótulos claros, filtros e edição pelo administrador |
| Cadastro público em massa | Alta | Baixo | Rate limit e CAPTCHA (não implementados) |

## Confirmação

- `POST /api/auth/register` com `SELLER`, `COURIER`, `SUPPORT` ou `ADMIN` retorna `403`; com `CUSTOMER` retorna `200` e `tenantId = null`.
- `POST /api/auth/admin/users` com `SELLER` sem loja ou `SUPPORT` com loja retorna `400`.
- Desativar um cliente faz o login retornar `403`; reativar devolve `200`.
- Admin não consegue desativar nem rebaixar a própria conta (`409`).
- `SUPPORT` lê `GET /api/auth/users` (`200`) e recebe `403` em `/api/auth/admin/**`.
- Erros de validação retornam `message` e `errors[]`.

## Mais informações

- [`../03-api.md`](../03-api.md#34-usuários-e-equipe) — contrato dos endpoints
- [`../04-dados.md`](../04-dados.md#31-identity) — schema e changesets
- [`../06-seguranca.md`](../06-seguranca.md#35-registro-público) — registro público e gestão de usuários
- [`../01-visao-geral.md`](../01-visao-geral.md) — perfis do produto
- [`../../api-configuracoes-admin.md`](../../api-configuracoes-admin.md) — guia de apoio do painel
