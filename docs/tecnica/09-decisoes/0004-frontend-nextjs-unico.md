# 0004 — Frontend único em Next.js para os quatro perfis

| Campo | Valor |
|---|---|
| Status | Aceito |
| Data de registro | 2026-10-26 |
| Decisores | Equipe de produto e arquitetura (registro retroativo) |
| Impacto | Produto |
| Substitui | — |
| Substituído por | — |

## Contexto e problema

O produto tem quatro experiências distintas: vitrine do cliente (white-label por loja), painel do vendedor, app do entregador e administração da plataforma. Cada uma tem público, frequência de uso e necessidades de UI diferentes.

Manter quatro aplicações separadas multiplica infraestrutura, autenticação e componentes. Manter uma só exige disciplina de rotas, temas e permissões.

> Como entregar quatro experiências distintas com uma equipe pequena sem quadruplicar o custo de frontend?

## Forças de decisão

- **F1** — Vitrine precisa ser white-label: cores, logo e banner por loja.
- **F2** — Painel administrativo e do vendedor compartilham tabelas, formulários e feedback de erro.
- **F3** — Time pequeno; uma base de código reduz manutenção.
- **F4** — Cliente acessa por link público (`/loja/{slug}`), sem instalar app.
- **F5** — O vendedor precisa de um app nativo para operação de balcão (notificações, câmera no futuro).

## Opções consideradas

### Opção 1 — Quatro aplicações separadas

Um projeto por perfil (storefront, seller, courier, admin).

**Prós**

- Isolamento total de deploy e bundle.
- Times independentes.
- Superfície de erro menor por app.

**Contras**

- Quatro pipelines, quatro autenticações, quatro designs.
- Duplicação de componentes e clientes de API.
- Custo desproporcional ao time atual.

### Opção 2 — Aplicação única Next.js com rotas por perfil (escolhida)

Um projeto Next.js 16 com App Router, rotas `/loja/[slug]`, `/vendedor`, `/entregador` e `/admin`, mais um hub em `/`.

**Prós**

- Um deploy, uma configuração, um conjunto de componentes.
- Tema por loja resolvido no servidor/cliente com dados do tenant.
- Compartilhamento de `apiClient`, tratamento de erro e design system.
- Rotas públicas e protegidas convivem no mesmo projeto.

**Contras**

- Bundle e superfície de ataque compartilhados.
- Acoplamento de release entre perfis.
- Exige separação rigorosa de contexto (admin vs. público).
- Autenticação precisa ser tratada por área, não pelo app inteiro.

### Opção 3 — Next.js para público/admin + apps nativos por perfil

**Prós**

- Melhor experiência operacional para vendedor e entregador.
- Notificações push nativas.

**Contras**

- Custo de desenvolvimento e distribuição.
- Não é o estado atual: só o vendedor tem app Android.

## Decisão

**Escolhemos a opção 2**, com uma exceção deliberada: o vendedor também tem um app Android nativo.

Estrutura real:

```text
frontend/src/app/
├── page.tsx                    # hub de perfis
├── loja/[slug]/page.tsx        # vitrine white-label
├── vendedor/                   # painel do vendedor (web)
├── entregador/page.tsx         # painel do entregador
└── admin/                      # login, pedidos, vendedores, entregadores, configurações
```

O tema por loja é derivado do `Tenant` (cores primária/secundária, logo, banner) e aplicado em tempo de execução. O acesso à API é centralizado em `src/lib/apiClient.ts`, com URL base em `src/lib/apiBaseUrl.ts`.

## Consequências

### Positivas

- Um único `npm run build` valida todo o frontend.
- Componentes de tabela, formulário e feedback são reutilizados entre admin e vendedor.
- O hub `/` permite alternar entre perfis durante demonstrações.
- A vitrine white-label não exige deploy por loja.

### Negativas

- **Autenticação heterogênea.** Admin e vendedor usam chaves de `localStorage` distintas; o entregador e o cliente não têm sessão.
- **Cliente do vendedor não envia `Authorization`.** As páginas funcionam porque os endpoints são públicos — ver [`06-seguranca.md`](../06-seguranca.md#l4--cliente-do-vendedor-no-web-não-envia-authorization-alta).
- **Bundle único.** Um erro em um componente compartilhado pode afetar todas as áreas.
- **Duas implementações de vendedor.** Web e Android precisam ser mantidos em paralelo, com contratos que já divergem (pagamentos).
- **Sem proteção de rota no servidor.** A verificação é feita no cliente; um usuário pode renderizar a página e ver dados públicos.
- **Sem testes de UI.** Nenhum teste de componente ou E2E.

### Neutras

- O Next.js 16 tem mudanças relevantes em relação a versões anteriores; `frontend/AGENTS.md` orienta consultar a documentação local antes de alterar configuração.
- Tailwind 4 é usado sem arquivo de configuração tradicional.

## Riscos e mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Vazamento de dados entre áreas por rota mal protegida | Média | Alto | Proteção no backend; nunca confiar no cliente |
| Divergência entre web e Android | Alta | Médio | Contrato único documentado e testado |
| Token em `localStorage` roubado por XSS | Média | Alto | CSP, sanitização, migração para cookie `HttpOnly` |
| Crescimento do bundle | Média | Baixo | Code splitting por rota; análise de bundle |
| Regressão visual sem testes | Alta | Médio | Playwright + snapshots |

## Confirmação

- Uma nova tela de perfil existente é adicionada como rota no mesmo projeto, reutilizando `apiClient`.
- Nenhuma regra de autorização é implementada apenas no frontend.
- A vitrine de uma nova loja funciona apenas cadastrando o tenant, sem deploy.

## Mais informações

- [`02-arquitetura.md`](../02-arquitetura.md) — camadas e fluxos
- [`03-api.md`](../03-api.md) — contratos consumidos pelo frontend
- [`07-qualidade-e-testes.md`](../07-qualidade-e-testes.md) — estratégia de testes de UI
- [Next.js App Router](https://nextjs.org/docs/app)
- [Tailwind CSS](https://tailwindcss.com/docs)
