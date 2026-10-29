---
name: commit-e-push-apos-build
description: Close every change to the delivery marketplace by validating the affected repository with its build command and, only when the build succeeds, creating a Conventional Commit and pushing it to origin. Use at the end of any task that modifies files in the umbrella repository or in one of its submodules.
---

# Commit e push depois do build verde

Esta skill fecha a tarefa: **build verde → commit → push**. A regra central:

> Se a alteração não compila/valida, não existe commit. Se compila, o trabalho não fica no working tree: vai para o remoto.

Ela complementa a skill [`atualizar-documentacao-tecnica`](../atualizar-documentacao-tecnica/SKILL.md): a documentação é atualizada **antes** do commit; o build é o portão; o push é o último passo.

## Quando aplicar

Ao final de **toda** tarefa que altere arquivos, em qualquer um destes repositórios:

| Repositório | Caminho | Observação |
|---|---|---|
| Guarda-chuva | raiz | `docs/`, `docker-compose.yml`, `AGENTS.md`, `.agents/`, ponteiros dos submódulos |
| Serviços | `backend/api-gateway`, `catalog-service`, `identity-service`, `order-service`, `tenant-service` | Cada um é um repositório Git independente |
| Web | `frontend` | Submódulo |
| Android | `mobile/cliente-android`, `mobile/vendedor-android` | Submódulos |

Não aplique quando a tarefa for apenas leitura (análise, revisão, resposta a pergunta) ou quando o usuário pedir explicitamente para não commitar.

## Ordem de execução

1. Terminar a alteração e atualizar a documentação afetada.
2. Identificar **todos** os repositórios com mudança da tarefa.
3. Rodar o gate de build de cada um (tabela abaixo).
4. Se **qualquer** gate falhar: parar, não commitar nada, corrigir ou relatar.
5. Commitar e dar push nos submódulos, depois no guarda-chuva.

## Gate de build por repositório

| Mudança | Gate | Comando |
|---|---|---|
| Serviço backend | Compila e empacota | `.\mvnw.cmd -DskipTests package` |
| Backend, mudança em teste | Testes do serviço (exige PostgreSQL) | `.\mvnw.cmd test` |
| `frontend` | Lint + build de produção | `npm run lint` e depois `npm run build` |
| `mobile/cliente-android` | APK debug | `.\gradlew.bat :app:assembleDebug` |
| `mobile/vendedor-android` | APK debug | `.\gradlew.bat :app:assembleDebug` |
| Raiz com `docker-compose.yml` | Compose válido | `docker compose config -q` |
| Raiz só com Markdown/config | Links e âncoras válidos | script da seção [Validação documental](#validação-documental) |

- O gate padrão do backend é `package -DskipTests`: os testes de contexto exigem PostgreSQL e falham em máquina sem `docker compose up -d`. Rode `test` quando a mudança for de teste ou quando o banco estiver disponível.
- `assembleDebug` é suficiente para o app; `assembleRelease` depende de assinatura e não é gate de PR.
- Se o build já rodou nesta tarefa e nada mudou desde então, reaproveite o resultado em vez de repetir.
- Falha de build **não** se contorna com `-DskipTests`, `--no-verify` ou `-x`. Corrija a causa.

## Detectar repositórios alterados

```powershell
# Raiz + submódulos, um por linha
git -C . status --porcelain
git submodule status | ForEach-Object {
  $path = ($_ -split ' ')[2]
  $changes = git -C $path status --porcelain
  if ($changes) { "== $path"; $changes }
}
```

Interprete:

- `m` na raiz é ponteiro de submódulo alterado: o commit do submódulo vem primeiro.
- Working tree sujo **antes** da tarefa não é da tarefa: não stage. Veja [Staging](#staging).
- Submódulo em `HEAD detached` (sem branch): pare e relate; não commite em detached.

## Staging

Stage **somente** os arquivos da tarefa, por caminho explícito:

```powershell
git add caminho/arquivo.kt outro/arquivo.md
git diff --cached --stat      # confira o que entrou
git diff --cached             # leia o diff antes do commit
```

Regras:

- Nunca `git add -A` ou `git add .` na raiz: o diretório guarda artefatos locais (`.run/`, `backend/http/`, `docs/prototype-*`, scripts de extração, `target/`, `node_modules/`, `.gradle/`, `build/`, `local.properties`).
- Nunca commite segredo, token, `.env`, chave SSH, `google-services.json` real, senha ou PII.
- Antes do commit, procure segredos no staged:

```powershell
git diff --cached | Select-String -Pattern 'password|secret|token|api[_-]?key|BEGIN .*PRIVATE KEY' -CaseSensitive:$false
```

- Remoção de arquivo entra com `git add -u caminho` ou `git rm caminho`.
- Se a tarefa tocar um arquivo que já tinha mudanças antigas (ex.: `docs/tecnica/08-desenvolvimento.md`), revise o diff inteiro: o commit leva o arquivo completo, não só as linhas novas.

## Commit

Formato [Conventional Commits](https://www.conventionalcommits.org/) em pt-BR, conforme [`08-desenvolvimento.md`](../../../docs/tecnica/08-desenvolvimento.md):

```text
feat(cliente): vincula estabelecimentos pelo link da loja
fix(identity): devolve 503 quando o tenant está fora
docs(tecnica): documenta app cliente multi-loja
chore(infra): injeta SERVICES_TENANT_URL no identity
```

- Um commit por repositório e por intenção. Se a tarefa tocar vários repositórios, use o mesmo assunto em todos.
- Corpo quando o diff não explica o motivo; rodapé com `Closes #N` se houver issue.
- Não use `--amend` em commit já enviado ao remoto.
- Não pule hooks (`--no-verify`). Se o hook falhar, corrija e repita.

## Push

Ordem obrigatória, porque o guarda-chuva referencia o SHA de cada submódulo:

1. submódulos alterados;
2. por último, a raiz (com os ponteiros atualizados).

```powershell
# dentro de cada repositório alterado
git push origin HEAD

# confirme que o remoto recebeu o commit
git rev-parse HEAD
git rev-parse "origin/$(git rev-parse --abbrev-ref HEAD)"
```

- `git push origin HEAD` envia a branch atual; se não houver upstream, use `git push -u origin HEAD`.
- **Nunca** `--force` nem `--force-with-lease` sem pedido explícito do usuário.
- Não envie tags nem branches não relacionadas.
- Fetch/rebase automático não faz parte da skill: se o remoto divergiu, pare e relate.

## Na raiz: ponteiros dos submódulos

Depois de commitar e dar push nos submódulos, a raiz ainda aponta para os SHAs antigos. Atualize:

```powershell
git add backend/identity-service mobile/cliente-android   # caminhos dos submódulos alterados
git status --short
git commit -m "chore: atualiza ponteiros dos submódulos"
git push origin HEAD
```

Se a raiz tiver mudanças próprias (docs, `docker-compose.yml`, `.agents/`), elas podem entrar no mesmo commit ou em um commit separado — desde que o assunto deixe claro o que mudou.

## Falhas e o que fazer

| Situação | Ação |
|---|---|
| Build falha | **Não commite.** Corrija ou relate o erro com a saída relevante; o working tree fica intacto. |
| Build passa, push falha (rede/auth) | Mantenha o commit local, tente uma vez de novo e **relate que não foi enviado**. Nunca afirme push concluído. |
| Nada a commitar | Diga explicitamente que não houve mudança; não crie commit vazio. |
| Submódulo em detached HEAD | Pare e relate; commitar ali perde o commit no próximo checkout. |
| Remoto divergiu | Pare e relate; não faça merge/rebase automático. |
| Conflito de merge | Pare; não resolva escolhendo um lado sem entender. |
| Hook falha | Corrija a causa; não use `--no-verify`. |

## Validação documental

Gate para mudanças só de Markdown/config na raiz:

```powershell
$root = (Get-Location).Path
function Anchor([string]$text) {
  $t = $text.ToLowerInvariant()
  $t = $t -replace '[^\p{L}\p{N}\s_-]', ''
  $t = $t -replace '\s', '-'
  return $t
}
$files = Get-ChildItem docs\tecnica -Recurse -Filter *.md
$anchors = @{}
foreach ($f in $files) {
  $set = New-Object System.Collections.Generic.HashSet[string]
  foreach ($line in [System.IO.File]::ReadAllLines($f.FullName, [System.Text.Encoding]::UTF8)) {
    if ($line -match '^(#{1,6})\s+(.*)$') { [void]$set.Add((Anchor $matches[2].Trim())) }
  }
  $anchors[$f.FullName] = $set
}
$bad = @()
foreach ($f in $files) {
  $text = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
  foreach ($m in [regex]::Matches($text, '\]\((?<u>[^)]+)\)')) {
    $u = $m.Groups['u'].Value
    if ($u -match '^https?:' -or $u -notmatch '#') { continue }
    $path = ($u -split '#')[0]
    $frag = ($u -split '#',2)[1]
    $target = if ([string]::IsNullOrWhiteSpace($path)) { $f.FullName } else { Join-Path $f.DirectoryName $path }
    if (-not (Test-Path $target)) { continue }
    $key = (Resolve-Path $target).Path
    if ($anchors.ContainsKey($key) -and -not $anchors[$key].Contains($frag)) { $bad += "$($f.Name) -> $u" }
  }
}
if ($bad.Count -eq 0) { 'OK: todas as ancoras existem' } else { $bad }
```

Leia os arquivos como UTF-8: o console do PowerShell em cp1252 mostra acentos quebrados e gera falso negativo em âncoras com `ç`, `ã` e `é`. Também confira que todo caminho relativo citado existe.

## Checklist de conclusão

- [ ] Documentação afetada atualizada (skill `atualizar-documentacao-tecnica`).
- [ ] Gate de build de **cada** repositório alterado executado e verde.
- [ ] `git status --porcelain` revisado antes e depois do staging.
- [ ] Somente arquivos da tarefa no commit; nenhum segredo, artefato de build ou `target/`.
- [ ] Mensagem no padrão `<tipo>(<escopo>): <descrição>`.
- [ ] Submódulos commitados e enviados antes da raiz.
- [ ] `HEAD` igual a `origin/<branch>` em todos os repositórios enviados.
- [ ] Resumo final informa repositórios, hashes, branch e o que foi enviado — ou o motivo de não ter sido.
