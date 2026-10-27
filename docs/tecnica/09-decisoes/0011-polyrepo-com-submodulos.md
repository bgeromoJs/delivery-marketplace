# 0011 — Polyrepo com submódulos Git

| Campo | Valor |
|---|---|
| Status | Aceito (parcialmente substituído) |
| Data de registro | 2026-10-27 |
| Decisores | Equipe de arquitetura |
| Impacto | Estrutural |
| Substitui | Parcialmente [0001](0001-microsservicos-e-api-gateway.md) (organização do repositório) |
| Substituído por | Parcialmente [0014](0014-remocao-do-agregador-maven.md) (agregador Maven em `backend/`) |

## Contexto e problema

O projeto reúne cinco serviços backend, um frontend web e dois apps Android. Até 2026-10-27 tudo vivia em um único repositório Git, com `backend/pom.xml` agregando os serviços como módulos Maven.

A organização exigida pelo produto é que **cada serviço tenha seu próprio repositório e seu próprio histórico**, de modo que um time possa versionar, revisar e publicar um serviço sem tocar no restante. Ao mesmo tempo, o ambiente local precisa continuar reproduzível: quem clona o workspace deve obter exatamente as versões que compõem o sistema.

> Como dar autonomia de repositório a cada projeto sem perder a capacidade de reconstruir o ambiente integrado?

## Forças de decisão

- **F1** — Cada serviço, frontend e app Android precisa de repositório e histórico próprios.
- **F2** — O ambiente local precisa ser reproduzível a partir de um único clone.
- **F3** — Não existe registry Maven, pipeline de CI nem host de repositório definido no momento da decisão.
- **F4** — Equipe pequena; o custo operacional do modelo precisa ser baixo.
- **F5** — O guarda-chuva deve concentrar orquestração (`docker-compose.yml`, `docker/`, `docs/`, `scripts/`), não código de aplicação.

## Opções consideradas

### Opção 1 — Manter monorepo

Um único repositório com todos os projetos.

**Prós**

- Um clone, um pipeline, um PR por mudança transversal.
- Versões alinhadas por construção.

**Contras**

- Contraria o requisito de repositório por projeto.
- Um release de serviço arrasta o histórico de todos os outros.
- Permissões e revisores não podem ser separados por domínio.

### Opção 2 — Polyrepo com submódulos Git (escolhida)

Cada projeto é um repositório; o guarda-chuva registra o SHA de cada um em `.gitmodules`.

**Prós**

- Atende F1 sem abrir mão de F2: o clone recursivo reconstrói o ambiente exato.
- Ferramenta padrão do Git; nenhuma dependência adicional.
- O guarda-chuva fica restrito a orquestração e documentação (F5).
- Permite evoluir cada repositório para seu próprio CI.

**Contras**

- Detached HEAD por padrão nos submódulos.
- Exige disciplina: push no repositório filho antes de commitar o ponteiro.
- Mudança transversal vira N PRs coordenados.
- Um clone sem `--recurse-submodules` resulta em pastas vazias.

### Opção 3 — Polyrepo com manifesto (`repos.yaml` + script)

Os repositórios são independentes e um script os clona a partir de uma lista.

**Prós**

- Nenhuma dor de submódulo; cada projeto é autônomo de fato.
- Fácil de estender com metadados (branch, script de build).

**Contras**

- Sem pin: dois clones em datas diferentes podem ter combinações distintas (viola F2).
- Exige escrever e manter ferramenta própria.

## Decisão

**Escolhemos a opção 2.**

O repositório `delivery-marketplace` passa a ser um guarda-chuva de orquestração com oito submódulos: `backend/api-gateway`, `backend/identity-service`, `backend/tenant-service`, `backend/catalog-service`, `backend/order-service`, `frontend`, `mobile/cliente-android` e `mobile/vendedor-android`. O `pom.xml` agregador em `backend/` foi removido depois, no [ADR 0014](0014-remocao-do-agregador-maven.md); na data desta decisão ele ainda existia como conveniência local.

Enquanto não há host definido (F3), o `.gitmodules` aponta para caminhos locais relativos. `scripts/set-submodule-urls.ps1` reescreve as URLs para o host real quando ele existir.

## Consequências

### Positivas

- Cada projeto tem branches, tags, permissões e CI próprios.
- O guarda-chuva deixa de carregar código de aplicação.
- O ambiente integrado continua reproduzível pelo SHA registrado.
- O `docker-compose.yml` e a documentação técnica permanecem em um único lugar.

### Negativas

- **Sem parent POM compartilhado.** Cada serviço declara `spring-boot-starter-parent` 4.1.1 e suas próprias versões. Um bump de Spring Boot exige cinco PRs. A criação de um repositório `delivery-parent` (parent + BOM publicado) fica como dívida registrada.
- **Mudança de contrato entre serviços** deixa de ser um commit e passa a exigir ordem de merge e compatibilidade para frente e para trás.
- **Histórico anterior** (três commits do monorepo) fica apenas no guarda-chuva; cada repositório inicia com um commit `chore: repositorio inicial do projeto`.
- **Onboarding** exige `git clone --recurse-submodules` ou `scripts/bootstrap.ps1`.
- **Nenhum CI** existe ainda; a decisão não resolve integração contínua, apenas a habilita por repositório.

### Neutras

- O nome da branch padrão dos novos repositórios é `main`; o guarda-chuva continua em `master`.
- Os apps Android deixaram de ter aninhamento duplicado (`mobile/<app>/<app>/`).
- `.gitignore` por projeto passou a existir para os apps Android, que antes não tinham controle de artefatos de build.

## Riscos e mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Ponteiro commitado sem push no repositório filho | Alta | Alto | Regra documentada em `08-desenvolvimento.md`; CI do guarda-chuva validando `git submodule status` |
| Drift de versão de dependências entre serviços | Alta | Médio | Criar repositório `delivery-parent` com BOM publicado |
| Clone sem submódulos gera ambiente incompleto | Média | Médio | `scripts/bootstrap.ps1` e instrução no `README.md` |
| Mudança transversal quebra serviço não atualizado | Média | Alto | Contrato versionado e testes de contrato antes de mudar payload |
| URLs locais no `.gitmodules` impedem clone em outra máquina | Alta | Médio | `scripts/set-submodule-urls.ps1` até o host ser definido |

## Confirmação

A decisão está sendo seguida quando:

- Nenhum código de aplicação é commitado no guarda-chuva.
- Todo novo projeto entra como repositório próprio e é registrado como submódulo.
- O `docker-compose.yml`, `docs/` e `scripts/` continuam sendo a única responsabilidade do guarda-chuva.
- Um clone recursivo sobe o ambiente sem ajustes manuais além de `docker compose up -d`.

## Mais informações

- [`08-desenvolvimento.md`](../08-desenvolvimento.md) — estrutura e fluxo de trabalho com submódulos
- [`05-operacao.md`](../05-operacao.md) — obtenção do código e subida do ambiente
- [`02-arquitetura.md`](../02-arquitetura.md) — restrições organizacionais e visão de implantação
- [git-submodule](https://git-scm.com/docs/git-submodule)
- [Monorepo vs. polyrepo](https://martinfowler.com/bliki/Monorepo.html)
