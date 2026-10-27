# 0012 — Kit de desenvolvimento com Compose em dois modos

| Campo | Valor |
|---|---|
| Status | Substituído por [0013](0013-compose-unico-com-tudo.md) |
| Data de registro | 2026-10-27 |
| Decisores | Equipe de arquitetura |
| Impacto | Operacional |
| Substitui | — |
| Substituído por | 0013 |

## Contexto e problema

Novos desenvolvedores precisam subir cinco serviços Spring Boot, um frontend Next.js e três dependências de infraestrutura para ter o sistema funcionando. O `docker-compose.yml` cobria apenas a infraestrutura: cada pessoa ainda precisava abrir cinco terminais, configurar `JWT_SECRET`, ativar seeders e repetir o processo a cada máquina.

Além disso, o gateway tinha as doze rotas com `http://localhost:<porta>` fixo, o que impedia rodar os serviços em containers — dentro do container, `localhost` não é o gateway nem os outros serviços.

> Como transformar o repositório guarda-chuva em um kit de onboarding que sobe o ambiente completo com um comando, sem perder o fluxo de desenvolvimento com hot reload?

## Forças de decisão

- **F1** — Um comando deve levar do clone ao sistema funcionando.
- **F2** — O desenvolvimento diário precisa de hot reload e debugger; containers atrapalham esse ciclo.
- **F3** — As aplicações precisam funcionar em containers sem alterar código de negócio.
- **F4** — A infraestrutura já é containerizada e não deve mudar de comportamento.
- **F5** — O guarda-chuva não deve concentrar código de aplicação (ver [ADR 0011](0011-polyrepo-com-submodulos.md)).

## Opções consideradas

### Opção 1 — Manter apenas infraestrutura no Compose

Cada desenvolvedor sobe os serviços manualmente.

**Prós**

- Hot reload preservado em todos os serviços.
- Nenhuma imagem para construir.

**Contras**

- Onboarding de 30+ minutos e propenso a erro.
- Nenhuma validação ponta a ponta automatizável.
- Não atende F1.

### Opção 2 — Tudo em containers, sempre

Um único `docker compose up` com infraestrutura e aplicações.

**Prós**

- Ambiente idêntico para todos.
- Um comando.

**Contras**

- Rebuild de imagem a cada alteração de código Java.
- Sem hot reload; debug remoto na JVM.
- Piora o ciclo de quem desenvolve diariamente.

### Opção 3 — Compose em dois modos com profiles (escolhida)

Infraestrutura no modo padrão; aplicações no profile `apps`.

**Prós**

- Atende F1 e F2: `docker compose up -d` para o dia a dia, `--profile apps` para o fluxo completo.
- Um único arquivo para manter.
- Serve de base para CI futuro.

**Contras**

- Dois modos para documentar e explicar.
- Imagens construídas localmente, sem registry.
- A primeira subida com `--build` é lenta.

## Decisão

**Escolhemos a opção 3.**

O `docker-compose.yml` mantém a infraestrutura sem profile e adiciona cinco serviços e o frontend sob `profiles: ["apps"]`. Cada projeto ganhou um `Dockerfile` multi-stage no próprio repositório: `maven:3.9-eclipse-temurin-21` → `eclipse-temurin:21-jre-alpine` para os serviços, e `node:22-alpine` com `output: "standalone"` para o frontend.

As rotas do gateway passaram a ser parametrizadas, mantendo `localhost` como default para não quebrar o modo nativo:

```yaml
- id: identity-service
  uri: ${IDENTITY_SERVICE_URL:http://localhost:8081}
```

O mesmo padrão vale para `SERVICES_TENANT_URL` e `SERVICES_CATALOG_URL`, já lidos por `TenantLookup`, `OrderDataSeeder` e `CatalogLookup`.

O `scripts/dev.ps1` encapsula os comandos (`infra`, `apps`, `down`, `reset`, `logs`, `ps`) para que o onboarding não dependa de memorizar flags.

## Consequências

### Positivas

- Onboarding passa a ser: clone recursivo → `.env` → `dev.ps1 apps`.
- O fluxo nativo continua idêntico para quem prefere hot reload.
- O compose vira a base para um pipeline de integração futura.
- O modo containers valida o mesmo artefato que seria publicado.

### Negativas

- **Sem hot reload no modo `apps`.** Alterar Java exige `docker compose --profile apps build <serviço>`.
- **`NEXT_PUBLIC_API_URL` é embutido no bundle em tempo de build.** Trocar a URL exige rebuild da imagem do frontend.
- **`docker/init-db.sql` só executa com o volume vazio.** Recriar bancos exige `dev.ps1 reset`, que apaga dados.
- **Imagens sem registry.** Tags `:dev` locais; não há publicação nem versionamento de imagem.
- **Consumo de memória.** Seis containers de aplicação somados à infraestrutura exigem ~4 GB livres no Docker Desktop.
- **Seeders desligados por padrão.** Sem `APP_SEED_DEMO_DATA=true`, o ambiente sobe sem dados de demonstração.

### Neutras

- As portas `8081`–`8084` continuam publicadas no modo `apps`, para acesso direto ao Swagger de cada serviço.
- `restart: always` foi trocado por `unless-stopped` na infraestrutura.
- O Redis ganhou healthcheck, embora continue sem uso pelo código.

## Riscos e mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Primeira subida lenta desestimular o uso | Alta | Médio | Documentar o tempo esperado; `dev.ps1 infra` como caminho padrão |
| Alguém edita código esperando hot reload no modo `apps` | Alta | Baixo | Aviso explícito em `05-operacao.md` §3.7 |
| `down -v` acidental apaga dados locais | Média | Médio | `reset` é o único comando que usa `-v`, e avisa no console |
| Imagens `:dev` divergirem entre máquinas | Média | Médio | Rebuild explícito; CI publicará imagens versionadas no futuro |
| Serviços internos expostos na rede local | Baixa | Médio | Publicar apenas `8080` fora do ambiente de desenvolvimento |

## Confirmação

A decisão está sendo seguida quando:

- `docker compose up -d` sobe apenas infraestrutura.
- `docker compose --profile apps up -d --build` sobe o sistema completo e o `http://localhost:3000` responde.
- Nenhum `Dockerfile` fica no guarda-chuva: todos vivem no repositório do projeto correspondente.
- Nenhuma rota do gateway volta a usar `localhost` fixo.

## Mais informações

- [`05-operacao.md`](../05-operacao.md) — §3.7 ambiente completo em containers
- [`08-desenvolvimento.md`](../08-desenvolvimento.md) — §12 ambiente de desenvolvimento
- [`02-arquitetura.md`](../02-arquitetura.md) — visão de implantação
- [Docker Compose profiles](https://docs.docker.com/compose/how-tos/profiles/)
- [Next.js — Docker standalone output](https://github.com/vercel/next.js/tree/canary/examples/with-docker)
