# 0013 — Compose único com infraestrutura, backend e frontend

| Campo | Valor |
|---|---|
| Status | Aceito |
| Data de registro | 2026-10-27 |
| Decisores | Equipe de arquitetura |
| Impacto | Operacional |
| Substitui | [0012](0012-kit-desenvolvimento-em-containers.md) |
| Substituído por | — |

## Contexto e problema

O [ADR 0012](0012-kit-desenvolvimento-em-containers.md) separou o ambiente em dois modos via profiles: sem profile subia apenas infraestrutura, com `--profile apps` subia também os cinco serviços e o frontend.

Na prática, o modo padrão passou a ser um ambiente incompleto. Quem chega novo roda `docker compose up -d`, vê Postgres e Redpanda de pé e conclui que o sistema está no ar — mas nada responde em `:3000` nem em `:8080`. A flag `--profile apps` vira conhecimento tribal, e todo comando (`up`, `down`, `logs`, `ps`) precisa repeti-la.

> Como fazer `docker compose up` entregar o sistema funcionando, sem exigir que a pessoa saiba qual flag usar?

## Forças de decisão

- **F1** — Um comando deve subir o ambiente completo.
- **F2** — O ambiente de desenvolvimento diário precisa continuar possível com as aplicações nativas.
- **F3** — O arquivo deve ser legível e não depender de estado implícito (variável de ambiente que ativa profiles).
- **F4** — Onboarding não deve exigir leitura de documentação para o caminho feliz.

## Opções consideradas

### Opção 1 — Manter profiles e definir `COMPOSE_PROFILES=apps` no `.env`

O comportamento padrão passaria a incluir as aplicações por variável de ambiente.

**Prós**

- Nenhuma alteração nos serviços do compose.
- `docker compose down` e `logs` continuam precisando da flag apenas se o `.env` for removido.

**Contras**

- Ativação implícita: apagar o `.env` muda silenciosamente o que sobe.
- `docker compose config` passa a depender de estado externo ao arquivo.
- Viola F3 e F4.

### Opção 2 — Compose único sem profiles (escolhida)

Todos os serviços no mesmo arquivo, sem profiles.

**Prós**

- `docker compose up -d --build` sobe tudo e é o único caminho a memorizar.
- `down`, `logs` e `ps` funcionam sem flag.
- Um arquivo descreve o sistema inteiro.

**Contras**

- A primeira subida sempre constrói seis imagens.
- Rodar só a infraestrutura exige listar os serviços no comando.

### Opção 3 — Dois arquivos (`compose.infra.yml` e `compose.yml`)

Separação física entre infraestrutura e aplicações.

**Prós**

- Cada arquivo tem um propósito único e legível.
- `-f` deixa o modo explícito.

**Contras**

- Duplica redes, volumes e dependências entre arquivos, ou exige `include`/`-f` combinado.
- Dois arquivos para manter sincronizados.
- Todo comando volta a precisar de flag.

## Decisão

**Escolhemos a opção 2.**

Os profiles foram removidos. `docker compose up -d --build` sobe PostgreSQL, Redis, Redpanda, Console, os cinco serviços e o frontend. Para o desenvolvimento diário com hot reload, a infraestrutura sobe isolada listando os serviços:

```powershell
docker compose up -d postgres redis redpanda redpanda-console redpanda-init
```

O `scripts/dev.ps1` passou a ter `up` como ação padrão e `infra` para o modo reduzido. Os `Dockerfile` continuam em cada repositório de projeto, conforme o ADR 0011.

## Consequências

### Positivas

- Um comando entrega o sistema completo; onboarding sem flag.
- `down`, `logs` e `ps` deixam de exigir `--profile`.
- O compose descreve o sistema inteiro em um arquivo.

### Negativas

- **Primeira subida sempre constrói seis imagens**, mesmo para quem só quer o banco. Mitigação: `dev.ps1 infra` para o fluxo nativo.
- **Modo infra-only fica mais verboso**: é preciso listar cinco serviços.
- **Consumo de memória passa a ser o padrão.** Quem só quer Postgres deve usar o modo reduzido.
- **Rebuild explícito** continua necessário a cada alteração de código Java.

### Neutras

- Nenhuma mudança de imagem, porta ou variável de ambiente em relação ao ADR 0012.
- O `dev.ps1` muda de `apps` para `up`; `infra` permanece.

## Riscos e mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Alguém roda `up` sem querer e espera 15 min de build | Média | Médio | `dev.ps1` avisa o tempo esperado no console |
| Máquina com pouca RAM sofre com 11 containers | Média | Médio | Documentar o modo `infra` em `05-operacao.md` §3.7 |
| Modo infra-only listar serviço errado | Baixa | Baixo | Comando copiável na documentação e no `dev.ps1` |

## Confirmação

A decisão está sendo seguida quando:

- `docker compose up -d --build` sobe 11 containers e `http://localhost:3000` responde.
- Nenhum serviço do compose volta a ter `profiles`.
- A documentação não menciona mais `--profile apps`.

## Mais informações

- [ADR 0012](0012-kit-desenvolvimento-em-containers.md) — decisão substituída
- [`05-operacao.md`](../05-operacao.md) — §3.7 ambiente completo em containers
- [`08-desenvolvimento.md`](../08-desenvolvimento.md) — §12 ambiente de desenvolvimento
- [Docker Compose — profiles](https://docs.docker.com/compose/how-tos/profiles/)
