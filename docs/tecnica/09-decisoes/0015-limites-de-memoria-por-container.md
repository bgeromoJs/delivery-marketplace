# 0015 — Limites de memória por container

| Campo | Valor |
|---|---|
| Status | Aceito |
| Data de registro | 2026-10-27 |
| Decisores | Equipe de arquitetura |
| Impacto | Operacional |
| Substitui | — |
| Substituído por | — |

## Contexto e problema

O kit sobe seis containers de aplicação junto com a infraestrutura. Nenhum deles tinha limite de memória: o `Dockerfile` usava `-XX:MaxRAMPercentage=75`, mas sem `mem_limit` no Compose o JVM dimensiona o heap contra a memória da máquina, não contra um teto. Numa máquina de 16 GB, cada serviço podia reservar até 12 GB de heap — e cinco serviços competindo por RAM derrubam o Docker Desktop e o restante do ambiente de trabalho.

A pergunta que originou a mudança foi se os processos estavam limitados a 128 MB. Não estavam: os `-Xms128m` dos run configs do IntelliJ definem apenas o heap **inicial**, e nenhum deles tinha `-Xmx`.

> Como impedir que um serviço em desenvolvimento consuma a máquina inteira sem introduzir falhas por falta de memória?

## Forças de decisão

- **F1** — O ambiente completo precisa caber numa máquina de desenvolvimento comum (8–16 GB), junto com IDE, navegador e emulador.
- **F2** — Os serviços não podem ser mortos por OOM em uso normal de desenvolvimento.
- **F3** — O limite deve ser declarativo e visível no Compose, não depender de flags na linha de comando.
- **F4** — Ajustar o teto de um serviço não deve exigir editar e reconstruir a imagem.
- **F5** — O frontend precisa de um teto menor que os serviços Java, porque consome muito menos.

## Opções consideradas

### Opção 1 — Não limitar e confiar no Docker Desktop

**Prós**

- Nenhuma configuração.
- Nenhum risco de OOM artificial.

**Contras**

- Um serviço com vazamento ou carga alta consome a máquina inteira.
- O comportamento varia conforme a RAM do host (viola F1).
- Sem teto, o heap é dimensionado contra a máquina, não contra o serviço.

### Opção 2 — `mem_limit` fixo e heap fixo (`-Xmx`) no `Dockerfile`

**Prós**

- Comportamento totalmente previsível.
- Heap explícito e fácil de auditar.

**Contras**

- Mudar o teto exige editar e reconstruir a imagem (viola F4).
- `-Xmx` fixo ignora o teto: os dois podem divergir silenciosamente.

### Opção 3 — `mem_limit` no Compose e heap proporcional ao teto (escolhida)

O teto fica no `docker-compose.yml`; o heap é uma porcentagem do teto, lida pelo JVM via cgroup.

**Prós**

- Um único lugar define o teto (F3).
- O heap acompanha automaticamente qualquer mudança de `mem_limit` (F4).
- O JVM é ciente de cgroups desde o Java 10, então a porcentagem vale o teto real do container.

**Contras**

- O heap efetivo é um número calculado, não explícito no arquivo.
- Rodar a imagem fora do Compose, sem `mem_limit`, faz a porcentagem incidir sobre a RAM do host.

## Decisão

**Escolhemos a opção 3.**

Cada serviço de aplicação no `docker-compose.yml` declara teto e reserva:

| Serviço | `mem_limit` | `mem_reservation` |
|---|---|---|
| identity-service | 512 MB | 256 MB |
| tenant-service | 512 MB | 256 MB |
| catalog-service | 512 MB | 256 MB |
| order-service | 512 MB | 256 MB |
| api-gateway | 512 MB | 256 MB |
| web | 448 MB | 128 MB |

Nos `Dockerfile` dos cinco serviços, `JAVA_MAX_RAM_PERCENTAGE` passou de 75 para **40**, e o `ENTRYPOINT` passou a ler a variável:

```dockerfile
ENV JAVA_MAX_RAM_PERCENTAGE=40
ENTRYPOINT ["sh", "-c", "exec java -XX:MaxRAMPercentage=${JAVA_MAX_RAM_PERCENTAGE} -XX:+ExitOnOutOfMemoryError -jar /app/app.jar"]
```

Com 512 MB de teto, o heap fica em ~206 MB e os ~306 MB restantes cobrem metaspace, code cache, threads, buffers nativos e overhead do SO. `-XX:+ExitOnOutOfMemoryError` faz o processo terminar em vez de ficar em estado inconsistente; o `restart: unless-stopped` já existente o reinicia.

No frontend, o `Dockerfile` define `NODE_OPTIONS="--max-old-space-size=192"` e o container tem 448 MB. Node não lê cgroup automaticamente para dimensionar o heap, por isso o valor é explícito. O V8 reserva ~192 MB além do old space (young generation e code space), então o teto real do heap fica em ~384 MB — abaixo do `mem_limit`, para que o V8 dispare `JavaScript heap out of memory` antes de o Docker matar o container com SIGKILL.

A infraestrutura (`postgres`, `redis`, `redpanda`, `redpanda-console`) ficou sem `mem_limit`: o Redpanda já recebe `--memory 512M` na linha de comando, e limitar o PostgreSQL no ambiente de desenvolvimento troca um risco pequeno por um risco de corrupção sob pressão de memória.

## Consequências

### Positivas

- O teto das seis aplicações é **~3,0 GB**, em vez de "o quanto o host tiver".
- Um serviço com vazamento não derruba o ambiente inteiro.
- O frontend tem teto próprio, menor que os serviços Java.
- Ajustar um serviço é uma linha no Compose, sem rebuild.

### Negativas

- **OOM passa a ser possível.** Um serviço que precise de mais de ~206 MB de heap será reiniciado. Mitigação: `JAVA_MAX_RAM_PERCENTAGE` por serviço no Compose.
- **Dois lugares para entender**: teto no Compose, porcentagem no `Dockerfile`.
- **Valores não medidos.** Foram escolhidos por estimativa; não há medição com carga real.
- **Fora do Compose não há teto.** `docker run` sem `--memory` faz a porcentagem incidir sobre a RAM do host.

### Neutras

- Nenhuma mudança de porta, variável de aplicação ou contrato.
- A reserva (`mem_reservation`) não limita: só orienta o Docker sob pressão.

## Riscos e mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Serviço reiniciando por heap insuficiente | Média | Médio | `JAVA_MAX_RAM_PERCENTAGE=60` no serviço; `docker stats` para medir |
| Container morto com código 137 | Baixa | Médio | Aumentar `mem_limit`; investigar vazamento |
| Alguém rodar a imagem sem `mem_limit` | Média | Baixo | Documentado em `05-operacao.md` §3.7 |
| Valores inadequados para carga real | Alta | Baixo | Nota explícita de que não foram medidos; medir antes de produção |

## Confirmação

A decisão está sendo seguida quando:

- Todo serviço de aplicação no Compose tem `mem_limit` e `mem_reservation`.
- Nenhum `Dockerfile` volta a usar `-XX:MaxRAMPercentage=75` sem `mem_limit` correspondente.
- `docker stats` mostra os serviços dentro dos tetos declarados.
- O frontend tem teto menor que qualquer serviço backend.

## Mais informações

- [ADR 0013](0013-compose-unico-com-tudo.md) — compose único
- [`05-operacao.md`](../05-operacao.md) — §3.7 limites de memória, §4.1 `JAVA_MAX_RAM_PERCENTAGE`
- [`02-arquitetura.md`](../02-arquitetura.md) — §7.1 topologia com tetos
- [Java — `MaxRAMPercentage` e containers](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Runtime.html)
- [Docker Compose — `mem_limit`](https://docs.docker.com/reference/compose-file/services/#mem_limit)
- [Node.js — `--max-old-space-size`](https://nodejs.org/api/cli.html#--max-old-space-sizesize-in-mib)
