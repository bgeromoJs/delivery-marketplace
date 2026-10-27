# 0014 — Remoção do agregador Maven em `backend/`

| Campo | Valor |
|---|---|
| Status | Aceito |
| Data de registro | 2026-10-27 |
| Decisores | Equipe de arquitetura |
| Impacto | Estrutural |
| Substitui | Parcialmente [0011](0011-polyrepo-com-submodulos.md) (agregador Maven) |
| Substituído por | — |

## Contexto e problema

O [ADR 0011](0011-polyrepo-com-submodulos.md) transformou cada serviço em repositório Git independente e manteve, no guarda-chuva, o `backend/pom.xml` com os cinco serviços como módulos Maven, além de `mvnw`, `mvnw.cmd` e `.mvn/`. A justificativa era conveniência: compilar tudo com um comando.

Na prática, o agregador passou a contrariar a própria decisão que o manteve. Ele é código de build dentro de um diretório que deveria conter apenas submódulos, e sua lista de módulos precisa ser editada sempre que um serviço é adicionado ou removido — algo que, em polyrepo, não deveria exigir commit no guarda-chuva. Também não há como um clone sem submódulos inicializados compilar, então o comando "conveniente" só funciona depois de um passo que já é obrigatório.

> Um agregador Maven no guarda-chuva ainda se justifica depois que cada serviço virou repositório independente?

## Forças de decisão

- **F1** — O guarda-chuva não deve versionar código de aplicação nem de build de aplicação (ADR 0011, F5).
- **F2** — Cada serviço precisa compilar, testar e publicar de forma autônoma.
- **F3** — O kit de desenvolvimento já oferece um comando único para subir o sistema ([ADR 0013](0013-compose-unico-com-tudo.md)); a conveniência de "compilar tudo" deixou de ser o caminho principal.
- **F4** — Nenhuma pipeline de CI depende do agregador.
- **F5** — A remoção não pode quebrar o fluxo de quem roda um serviço isolado.

## Opções consideradas

### Opção 1 — Manter o agregador

**Prós**

- Um comando compila os cinco serviços.
- Útil para uma verificação rápida de que todos compilam.

**Contras**

- Viola F1 e F2: acopla builds independentes e exige edição no guarda-chuva a cada mudança de serviço.
- Duplica o Maven Wrapper: um no guarda-chuva, cinco nos serviços.
- Dá a falsa impressão de monorepo a quem chega novo.

### Opção 2 — Remover o agregador (escolhida)

`backend/` passa a conter apenas os cinco submódulos.

**Prós**

- Cumpre F1 e F2: o diretório espelha exatamente a topologia de repositórios.
- Elimina o Maven Wrapper duplicado no guarda-chuva.
- Cada serviço tem um único caminho de build, idêntico ao que a imagem Docker usa.
- Nenhum `pom.xml` do guarda-chuva para manter em sincronia.

**Contras**

- Compilar os cinco serviços exige um laço (`foreach`) ou cinco comandos.
- Verificação global de compilação deixa de ser um comando único.

### Opção 3 — Mover o agregador para um repositório separado

Criar um repositório `build-parent` com o `pom.xml` agregador.

**Prós**

- Preserva o comando único.
- Mantém o guarda-chuva limpo.

**Contras**

- Nono repositório para manter, com uma responsabilidade puramente cosmética.
- Ainda acopla as versões dos serviços a um artefato externo.
- Custo maior que o benefício para uma equipe pequena (F3, F4).

## Decisão

**Escolhemos a opção 2.**

Foram removidos do guarda-chuva `backend/pom.xml`, `backend/mvnw`, `backend/mvnw.cmd` e `backend/.mvn/`. O diretório `backend/` contém apenas os cinco submódulos, cada um com seu próprio `pom.xml` e Maven Wrapper.

O build passa a ser sempre por serviço:

```powershell
cd backend\identity-service
.\mvnw.cmd test
```

Para verificar os cinco de uma vez, sem agregador:

```powershell
Get-ChildItem backend -Directory | Where-Object { Test-Path "$($_.FullName)\pom.xml" } | ForEach-Object {
    Push-Location $_.FullName
    .\mvnw.cmd -q -o test-compile -DskipTests
    Pop-Location
}
```

O caminho principal de onboarding continua sendo o Compose do [ADR 0013](0013-compose-unico-com-tudo.md), que constrói as imagens a partir de cada serviço — e já usava, por definição, um build por repositório.

## Consequências

### Positivas

- `backend/` reflete a topologia real: cinco repositórios, nenhum código de orquestração.
- Um único caminho de build por serviço, igual ao da imagem Docker.
- Nenhuma edição no guarda-chuva ao adicionar ou remover serviço.
- Remove o Maven Wrapper duplicado.

### Negativas

- **Não há mais um comando único para compilar os cinco serviços.** Mitigação: laço documentado em [`07-qualidade-e-testes.md`](../07-qualidade-e-testes.md) §1.4.
- **Quem tinha o hábito de `cd backend && .\mvnw.cmd test` precisa mudar de fluxo.** Mitigação: nota explícita na documentação e no `README.md`.
- **Verificação global fica mais lenta** por não reaproveitar o reator Maven.

### Neutras

- Nenhuma mudança em código de aplicação, portas, imagens ou variáveis de ambiente.
- O `.idea` e o `backend/http/` (arquivos locais, não versionados) permanecem onde estão.

## Riscos e mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Alguém tenta `cd backend && .\mvnw.cmd` e não encontra o wrapper | Alta | Baixo | Nota em `README.md` e em `07-qualidade-e-testes.md` §1.4 |
| Um serviço quebrar sem ser notado por não haver build global | Média | Médio | CI por repositório quando existir; laço documentado para verificação local |
| Alguém recriar o agregador "por conveniência" | Baixa | Baixo | Este ADR e a regra de F1 |

## Confirmação

A decisão está sendo seguida quando:

- `backend/` contém apenas os cinco diretórios de serviço.
- Nenhum `pom.xml`, `mvnw`, `mvnw.cmd` ou `.mvn/` existe na raiz de `backend/`.
- A documentação não instrui `cd backend` para compilar.
- Cada serviço continua compilando isoladamente com o próprio wrapper.

## Mais informações

- [ADR 0011](0011-polyrepo-com-submodulos.md) — decisão parcialmente substituída
- [ADR 0013](0013-compose-unico-com-tudo.md) — compose único, build por serviço
- [`07-qualidade-e-testes.md`](../07-qualidade-e-testes.md) — §1.4 comandos reais
- [`08-desenvolvimento.md`](../08-desenvolvimento.md) — §1 estrutura do repositório
