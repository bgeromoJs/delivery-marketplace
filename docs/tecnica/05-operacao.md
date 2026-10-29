# 05 — Operação

| Campo | Valor |
|---|---|
| Status | Ambiente local implementado; produção não preparada |
| Público | Engenharia, operações, suporte e QA |
| Última revisão | 2026-10-28 |
| Escopo | Subida, configuração, saúde, troubleshooting e runbooks |
| Fonte de verdade | POMs, `application.yml`, `docker-compose.yml` e código |

---

## 1. Pré-requisitos

| Ferramenta | Versão mínima | Como verificar |
|---|---|---|
| Java JDK | 21 | `java -version` |
| Maven | Wrapper incluído (Maven 3.10.0) | `.\mvnw.cmd -v` |
| Docker Desktop | Compose v2 | `docker compose version` |
| Node.js | 20.9+ (recomendado 22 LTS) | `node -v` |
| npm | 10+ | `npm -v` |
| Android Studio | Opcional, para os apps cliente e vendedor | — |
| JDK para Android | 17 (configurado no Gradle) | — |
| Twilio | Opcional, apenas para reset de senha | — |

> O backend usa Java 21. O módulo Android compila com Java 17 (`sourceCompatibility`/`targetCompatibility`). Não confunda as duas exigências.

### 1.1 Obter o código

O guarda-chuva não contém o código dos projetos: cada serviço, o frontend e cada app Android são submódulos com repositório próprio. Um clone sem `--recurse-submodules` deixa essas pastas vazias.

```powershell
git clone --recurse-submodules <url-do-guarda-chuva> delivery-marketplace
cd delivery-marketplace

# Em um clone já existente, ou após mudar de branch:
.\scripts\bootstrap.ps1
```

`scripts\bootstrap.ps1` executa `git submodule update --init --recursive` e lista os SHAs registrados. Se o workspace foi copiado de outra máquina, rode `scripts\set-submodule-urls.ps1 -BaseUrl <url-base>` para apontar os submódulos ao host real.

> No Windows, a execution policy padrão pode bloquear os scripts (`... a execução de scripts foi desabilitada neste sistema`). Rode com `powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1 up` ou libere uma vez com `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

> **Ao alterar um projeto**, o commit é feito dentro do repositório dele. O guarda-chuva só registra o novo SHA. Commit e push no repositório filho **antes** de commitar o ponteiro no guarda-chuva; caso contrário o clone de outra pessoa aponta para um commit inexistente.

---

## 2. Portas e serviços

| Serviço | Porta | Dependência | Health |
|---|---|---|---|
| PostgreSQL | `5432` | Docker | `pg_isready` |
| Redis | `6379` | Docker (não usado) | — |
| Redpanda | `19092` (Kafka), `9644` (admin) | Docker (producer do order) | Healthcheck `rpk cluster info` |
| Redpanda Console | `8085` | Docker (depende do Redpanda) | `http://localhost:8085` |
| Redpanda Init | — | Docker, executa uma vez | Cria o tópico `order-events` |
| identity-service | `8081` | PostgreSQL | `/actuator/health` |
| tenant-service | `8082` | PostgreSQL | `/actuator/health` |
| catalog-service | `8083` | PostgreSQL, tenant | `/actuator/health` |
| order-service | `8084` | PostgreSQL, tenant (seed), Redpanda (opcional) | `/actuator/health` |
| api-gateway | `8080` | Serviços | `/actuator/health` |
| Web Next.js | `3000` | Gateway | — |
| Android | — | Gateway | — |

---

## 3. Subida do ambiente local

### 3.1 Ordem recomendada

```text
PostgreSQL
   ↓
identity + tenant + catalog (podem subir em paralelo)
   ↓
order (o seed consulta o tenant)
   ↓
gateway
   ↓
web / Android
```

O gateway pode subir antes dos serviços, mas as rotas falharão até que eles estejam disponíveis. O identity só depende do tenant em runtime (validação do link da loja em `POST /api/customers/me/stores`), não na subida.

### 3.2 Infraestrutura

```powershell
cd C:\Users\pc\Documents\workspace\delivery-marketplace
docker compose up -d
docker compose ps
```

Verifique o PostgreSQL:

```powershell
docker exec -it delivery-postgres pg_isready -U postgres
```

Na primeira subida, o script [`docker/init-db.sql`](../../docker/init-db.sql) cria:

- `identity_db`
- `tenant_db`
- `catalog_db`
- `order_db`

Se o volume `postgres_data` já existir, o script **não roda** e os bancos podem não existir. Ver troubleshooting.

O Compose também sobe o Redpanda, o Console em `http://localhost:8085` e o serviço `redpanda-init`, que executa uma única vez:

```powershell
docker exec -it delivery-redpanda rpk topic list --brokers redpanda:9092
```

O tópico `order-events` deve aparecer. Se o `redpanda-init` já tiver sido executado e o tópico removido, rode novamente:

```powershell
docker compose run --rm redpanda-init
```

O tópico também é criado automaticamente pelo broker, se `auto.create.topics.enable` estiver ativo; o init garante a existência antes da primeira publicação.

### 3.3 Segredo JWT

O gateway e o identity precisam usar **exatamente o mesmo** `JWT_SECRET`, com pelo menos 32 bytes.

```powershell
$env:JWT_SECRET = "dev-only-secret-with-at-least-32-characters-2026"
```

> A variável vale para processos iniciados no mesmo terminal. Se usar IntelliJ, configure em **Run/Debug Configurations → Environment variables** dos dois serviços.

### 3.4 Backend

Em terminais separados:

```powershell
# identity
cd backend\identity-service
$env:JWT_SECRET = "dev-only-secret-with-at-least-32-characters-2026"
$env:APP_SEED_DEMO_DATA = "true"
.\mvnw.cmd spring-boot:run
```

```powershell
# tenant
cd backend\tenant-service
$env:APP_SEED_DEMO_DATA = "true"
.\mvnw.cmd spring-boot:run
```

```powershell
# catalog
cd backend\catalog-service
$env:APP_SEED_DEMO_DATA = "true"
.\mvnw.cmd spring-boot:run
```

```powershell
# order
cd backend\order-service
.\mvnw.cmd spring-boot:run
```

```powershell
# gateway
cd backend\api-gateway
$env:JWT_SECRET = "dev-only-secret-with-at-least-32-characters-2026"
.\mvnw.cmd spring-boot:run
```

Alternativa por argumento Maven:

```powershell
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.arguments=--app.seed.demo-data=true"
```

### 3.5 Frontend

```powershell
cd frontend
npm install
$env:NEXT_PUBLIC_API_URL = "http://localhost:8080"
npm run dev
```

Abra `http://localhost:3000`.

> `NEXT_PUBLIC_*` é incorporada no build. Se mudar a URL, reinicie o `next dev` ou refaça o build.

Build de produção:

```powershell
npm run lint
npm run build
npm start
```

### 3.6 Android

Os dois apps são repositórios independentes: `mobile/cliente-android` (cliente) e `mobile/vendedor-android` (vendedor). Cada um é um projeto Gradle na raiz do próprio diretório.

```powershell
cd mobile\vendedor-android
.\gradlew.bat :app:assembleDebug
.\gradlew.bat :app:installDebug

# App do cliente
cd ..\cliente-android
.\gradlew.bat :app:assembleDebug
```

O app cliente não é mais white-label: um único APK serve qualquer loja. As propriedades Gradle são `APP_NAME` (nome do app na gaveta e marca da tela de login sem loja vinculada), `GOOGLE_CLIENT_ID` e `API_BASE_URL` (ver [4.2](#42-frontend-e-android)). A loja chega pelo deep link `deliveryhub://loja/{slug}` ou `https://.../loja/{slug}`.

- Emulador: a URL padrão `http://10.0.2.2:8080/api/` aponta para a máquina host.
- Dispositivo físico: use o IP da máquina e mantenha a barra final.

```powershell
.\gradlew.bat :app:assembleDebug -PAPI_BASE_URL=http://192.168.0.10:8080/api/
```

- O build `debug` permite cleartext HTTP; o `release` usa HTTPS e `usesCleartextTraffic=false`.
- O app precisa de rede local acessível e firewall liberado na porta `8080`.

Teste do link de estabelecimento (emulador ou aparelho conectado):

```powershell
# Abre o app pelo link da loja; sem sessão, a loja vira o hero do login e o vínculo
# é criado logo depois do login.
adb shell am start -a android.intent.action.VIEW -d "deliveryhub://loja/vera-marmitex" com.deliveryplatform.cliente

# Mesmo link via HTTPS (o host do link é ignorado; o app usa o slug)
adb shell am start -a android.intent.action.VIEW -d "https://deliveryhub.com.br/loja/vera-marmitex" com.deliveryplatform.cliente
```

- O app tem `launchMode="singleTop"`: um novo link com o app aberto chega em `onNewIntent` e abre a loja sem reiniciar a sessão.
- Sem um link em mãos, o build **debug** lista as lojas de `GET /api/tenants` na aba **Lojas**; o build `release` não mostra esse atalho.
- O link precisa existir no ambiente: `GET /api/tenants/{slug}/theme` responde `200`. Slug inexistente retorna `404` em `POST /api/customers/me/stores`.

### 3.7 Ambiente completo em containers

**Implementado.** O `docker-compose.yml` sobe **tudo** — PostgreSQL, Redis, Redpanda, Console, os cinco serviços e o frontend — com um comando. Não há profiles: as aplicações fazem parte do ambiente padrão.

```powershell
# Constrói as imagens e sobe o ambiente completo
docker compose up -d --build

# Atalho equivalente
.\scripts\dev.ps1 up
```

Antes da primeira subida, copie as variáveis:

```powershell
Copy-Item .env.example .env
```

Com `APP_SEED_DEMO_DATA=true` (o padrão do `.env.example`), o identity cria as contas de demonstração na primeira subida. O painel administrativo abre com `admin@delivery.com` / `admin123`; a lista completa de contas está em §6.4 e o procedimento quando o banco já tem usuários está em §6.2.

Se quiser rodar as aplicações nativamente (com hot reload) e usar o Docker apenas para infraestrutura, suba só esses serviços:

```powershell
docker compose up -d postgres redis redpanda redpanda-console redpanda-init
# ou
.\scripts\dev.ps1 infra
```

Em containers, os serviços falam entre si pelos nomes do Compose (`postgres`, `redpanda`, `tenant-service`) e não por `localhost`. Isso é feito por variáveis de ambiente, sem alterar o código:

| Serviço | Variável | Valor no Compose |
|---|---|---|
| identity, tenant, catalog, order | `SPRING_DATASOURCE_URL` | `jdbc:postgresql://postgres:5432/<serviço>_db` |
| order | `KAFKA_BOOTSTRAP_SERVERS` | `redpanda:9092` |
| order | `SERVICES_TENANT_URL` / `SERVICES_CATALOG_URL` | `http://tenant-service:8082` / `http://catalog-service:8083` |
| catalog | `SERVICES_TENANT_URL` | `http://tenant-service:8082` |
| gateway | `IDENTITY_SERVICE_URL`, `TENANT_SERVICE_URL`, `CATALOG_SERVICE_URL`, `ORDER_SERVICE_URL` | nomes dos serviços |
| web | `NEXT_PUBLIC_API_URL` (build arg) | `http://localhost:8080` |

Pontos de atenção:

- **`NEXT_PUBLIC_API_URL` é embutido no bundle em tempo de build.** Mudar a URL exige `docker compose build web`.
- **`docker/init-db.sql` só roda com o volume vazio.** Para recriar os bancos, use `.\scripts\dev.ps1 reset` (equivale a `down -v` + `up -d`).
- **Não há hot reload em containers.** Alterar código Java exige `docker compose build <serviço>` e `docker compose up -d <serviço>`; para o dia a dia, use a infraestrutura em container e as aplicações nativas.
- As portas `8081`–`8084` continuam publicadas para acesso direto ao Swagger de cada serviço. Fora do ambiente local, apenas `8080` deveria ser exposta.
- A primeira subida compila seis imagens e pode levar de 10 a 20 minutos; as seguintes usam cache.

#### Limites de memória

**Implementado.** Cada container de aplicação tem teto e reserva de memória declarados no `docker-compose.yml`. O teto vale para o container inteiro; o heap é uma fração dele, definida por `JAVA_MAX_RAM_PERCENTAGE` no `Dockerfile`.

| Serviço | `mem_limit` | `mem_reservation` | Heap máximo |
|---|---|---|---|
| identity-service | 512 MB | 256 MB | ~206 MB (40%) |
| tenant-service | 512 MB | 256 MB | ~206 MB (40%) |
| catalog-service | 512 MB | 256 MB | ~206 MB (40%) |
| order-service | 512 MB | 256 MB | ~206 MB (40%) |
| api-gateway | 512 MB | 256 MB | ~206 MB (40%) |
| web | 448 MB | 128 MB | ~384 MB (192 MB de old space + 192 MB de overhead do V8) |

Somando, o teto das seis aplicações é **~3,0 GB**; a infraestrutura (`postgres`, `redis`, `redpanda`, `redpanda-console`) não tem `mem_limit` e é limitada apenas pelo que o Docker Desktop oferece.

Como o limite é aplicado:

```yaml
# docker-compose.yml
mem_limit: 512m        # teto: o container é morto se passar disso
mem_reservation: 256m  # reserva: usada pelo Docker para decidir o que descartar sob pressão
```

```dockerfile
# Dockerfile — o heap acompanha o teto do container (JVM ciente de cgroups)
ENV JAVA_MAX_RAM_PERCENTAGE=40
```

Os 60% restantes do container cobrem metaspace, code cache, threads, buffers nativos e overhead do SO. Como o JVM lê o `mem_limit` pelo cgroup, mudar o teto no Compose reajusta o heap automaticamente — não é preciso editar o `Dockerfile`.

Ajustes comuns:

```powershell
# Dar mais heap a um serviço específico sem mudar o teto
# (docker-compose.yml, dentro do serviço)
#   environment:
#     JAVA_MAX_RAM_PERCENTAGE: 60

# Ver o consumo real de cada container
docker stats --no-stream
```

Quando o heap estoura, o processo sai com `ExitOnOutOfMemoryError` e o `restart: unless-stopped` o reinicia; o sintoma no log é `OutOfMemoryError` seguido de reinício. Se o container inteiro passar do teto, o Docker o mata com código **137** (`docker compose ps` mostra `Exited (137)`).

> Os valores são conservadores para desenvolvimento e **não foram medidos** com carga real. Para um ambiente com tráfego, meça com `docker stats` antes de fixar limites.

---

## 4. Variáveis de ambiente

### 4.1 Backend

| Variável | Serviços | Obrigatória | Default | Observação |
|---|---|---|---|---|
| `JWT_SECRET` | gateway, identity | Recomendada | Segredo de dev no YAML | ≥ 32 bytes; o mesmo nos dois. |
| `SPRING_DATASOURCE_URL` | identity, tenant, catalog, order | Não | `jdbc:postgresql://localhost:5432/<db>` | Um banco por serviço. |
| `SPRING_DATASOURCE_USERNAME` | idem | Não | `postgres` | — |
| `SPRING_DATASOURCE_PASSWORD` | idem | Não | `postgrespassword` | — |
| `SPRING_DATASOURCE_DRIVER` | idem | Não | `org.postgresql.Driver` | — |
| `APP_SEED_DEMO_DATA` | identity, tenant, catalog, order | Não | `false` | `true` ativa seeders condicionais. |
| `ADMIN_PHONE` | identity | Não | vazio | Usado na criação do admin demo. |
| `TWILIO_ACCOUNT_SID` | identity | Para SMS | vazio | — |
| `TWILIO_AUTH_TOKEN` | identity | Para SMS | vazio | — |
| `TWILIO_FROM_NUMBER` | identity | Para SMS | vazio | Número E.164 do Twilio. |
| `SERVICES_TENANT_URL` | identity, catalog, order | Não | `http://localhost:8082` | Usado pelo `TenantLookup`, pelo seed e pelo `TenantStoreLookup` do identity ao vincular a loja ao cliente (timeout 2 s/3 s). |
| `CATALOG_SERVICE_URL` | order | Não | `http://localhost:8083` | Leitura de esforço e janelas do catálogo; timeout de 2 s. |
| `SCHEDULING_DEFAULT_EFFORT_MINUTES` | order | Não | `20` | Esforço por unidade quando o prato não tem valor. |
| `SCHEDULING_MAX_DAYS_AHEAD` | order | Não | `7` | Quantos dias a agenda procura uma janela livre. |
| `KAFKA_BOOTSTRAP_SERVERS` | order | Não | `localhost:19092` | Broker do Redpanda. |
| `KAFKA_ENABLED` | order | Não | `true` | `false` desliga a publicação; SSE continua. |
| `KAFKA_ORDER_TOPIC` | order | Não | `order-events` | Tópico dos eventos de pedido. |
| `SECURITY_CORS_ALLOWEDORIGINPATTERNS` | gateway | Não | padrões locais | Lista separada por vírgula. |
| `JAVA_MAX_RAM_PERCENTAGE` | todos (imagem Docker) | Não | `40` | Percentual do `mem_limit` usado como heap. Definido no `Dockerfile`; sobrescreva no Compose se precisar de mais heap. |

> O nome canônico de `security.cors.allowed-origin-patterns` em variável de ambiente é `SECURITY_CORS_ALLOWEDORIGINPATTERNS` (relaxed binding). Em caso de dúvida, use `--security.cors.allowed-origin-patterns=...` como argumento.

### 4.2 Frontend e Android

| Variável | Onde | Efeito |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | frontend | URL do gateway; padrão `http://localhost:8080`. |
| `NODE_OPTIONS` | frontend (imagem Docker) | Padrão `--max-old-space-size=192`. Define o heap do Node em runtime. |
| `API_BASE_URL` | Android (Gradle property) | URL base com `/api/`; padrão `http://10.0.2.2:8080/api/`. |
| `APP_NAME` | app cliente (Gradle property) | Nome exibido na gaveta de apps e marca da tela de login sem loja vinculada; padrão `Delivery`. A loja **não** é escolhida no build: chega por `deliveryhub://loja/{slug}` ou `https://.../loja/{slug}`. |
| `GOOGLE_CLIENT_ID` | app cliente (Gradle property) | Client ID OAuth web; vazio esconde o botão de login Google. |

### 4.3 Exemplo de `.env` local

O repositório não possui `.env` versionado. Se criar um, **não commite**:

```text
JWT_SECRET=troque-por-um-segredo-de-32-bytes-ou-mais
APP_SEED_DEMO_DATA=true
ADMIN_PHONE=+5511999990000
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
KAFKA_BOOTSTRAP_SERVERS=localhost:19092
KAFKA_ENABLED=true
NEXT_PUBLIC_API_URL=http://localhost:8080
```

---

## 5. Verificação de saúde

### 5.1 Actuator

```powershell
Invoke-RestMethod http://localhost:8081/actuator/health
Invoke-RestMethod http://localhost:8082/actuator/health
Invoke-RestMethod http://localhost:8083/actuator/health
Invoke-RestMethod http://localhost:8084/actuator/health
Invoke-RestMethod http://localhost:8080/actuator/health
```

Resposta esperada:

```json
{ "status": "UP" }
```

O health do gateway **não** verifica os serviços downstream. Um gateway `UP` com serviço `DOWN` é possível.

### 5.2 Swagger

- Agregado: `http://localhost:8080/swagger-ui.html`
- Serviços: `http://localhost:8081/swagger-ui.html` a `:8084`.

### 5.3 Smoke test

```powershell
# 1. Login
$login = Invoke-RestMethod -Method Post http://localhost:8080/api/auth/login `
  -ContentType "application/json" `
  -Body '{"email":"admin@delivery.com","password":"admin123"}'

$token = $login.token
$headers = @{ Authorization = "Bearer $token" }

# 2. Lojas
Invoke-RestMethod http://localhost:8080/api/tenants?all=true

# 3. Tema (loja existente no ambiente local)
Invoke-RestMethod http://localhost:8080/api/tenants/vera-marmitex/theme

# 4. Cardápio
Invoke-RestMethod "http://localhost:8080/api/catalog/tenants/11111111-1111-1111-1111-111111111111/dishes"

# 5. Pedido
$order = Invoke-RestMethod -Method Post http://localhost:8080/api/orders `
  -ContentType "application/json" `
  -Body '{
    "tenantId":"11111111-1111-1111-1111-111111111111",
    "customerName":"Teste Operação",
    "deliveryAddress":"Rua de Teste, 1",
    "paymentMethod":"PIX",
    "deliveryFee":6.00,
    "items":[{"dishId":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","dishName":"Pizza","quantity":1,"unitPrice":54.90}]
  }'

# 6. Fila do vendedor
Invoke-RestMethod http://localhost:8080/api/store/me/orders
```

### 5.4 Critérios de saúde

| Verificação | Esperado |
|---|---|
| PostgreSQL | `pg_isready` retorna `accepting connections` |
| Bancos | 4 bancos existem |
| Serviços | 5 health `UP` |
| Liquibase | Changesets aplicados sem erro |
| Login | `200` com token |
| Lojas | 3 lojas demo quando seed ativo |
| Cardápio | 7 pratos quando seed ativo |
| Pedido | `200` com `status = PAID` |
| Fila | Lista contém o pedido criado |
| Tempo real | `GET /api/store/me/orders/stream` abre `text/event-stream` e recebe o evento do pedido criado |
| Redpanda | Tópico `order-events` existe e recebe o mesmo evento (Console em `:8085`) |

---

## 6. Dados de demonstração

### 6.1 Como ativar

O seed é controlado por `app.seed.demo-data` e só roda com a tabela do serviço vazia.

**Com Docker Compose** — a flag vem do `.env`, que o `docker-compose.yml` injeta em identity, tenant, catalog e order:

```text
APP_SEED_DEMO_DATA=true
```

Ela precisa estar definida **antes** do primeiro `up`. Se você alterou depois, recrie os serviços que leem a variável:

```powershell
docker compose up -d --force-recreate identity-service tenant-service catalog-service order-service
```

**Rodando nativamente** — variável de ambiente do processo:

```powershell
$env:APP_SEED_DEMO_DATA = "true"
```

Aplique antes de iniciar identity, tenant e catalog. O order tem seed próprio.

Nos dois modos, o seeder não age sobre um banco que já tem registros: ele não completa dados parciais. Para recomeçar em desenvolvimento:

```powershell
docker compose down -v
docker compose up -d
```

O `-v` apaga os volumes — bancos e dados incluídos.

### 6.2 Primeiro acesso e usuário inicial

Não existe endpoint de bootstrap. `POST /api/auth/register` cria **apenas** `CUSTOMER` — qualquer outro papel retorna `403` — e `POST /api/auth/admin/users` exige um token `ADMIN`. O primeiro administrador só aparece por uma destas vias:

| Via | Quando usar | Procedimento |
|---|---|---|
| Seed | Banco vazio e `APP_SEED_DEMO_DATA=true` | Subir o identity; `DataSeeder` cria as 5 contas de §6.4 |
| Reset dos volumes | Desenvolvimento; pode perder dados | `docker compose down -v` e subir de novo com a flag |
| SQL direto | Banco com dados que você precisa manter | `INSERT` em `users`; o primeiro login converte a senha em BCrypt |

Confira o que existe no banco:

```powershell
docker exec -it delivery-postgres psql -U postgres -d identity_db `
  -c "select email, role, active from users order by role;"
```

Se não houver nenhum `ADMIN` ativo, o painel administrativo fica inacessível e a saída é o SQL direto:

```sql
INSERT INTO public.users (id, name, email, password, role, created_at)
VALUES (gen_random_uuid(), 'Administrador', 'admin@delivery.com', 'admin123', 'ADMIN', now());
```

`phone`, `tenant_id`, `active`, `google_sub` e `food_preferences` são opcionais — `active` assume `true` pelo default da coluna.

A senha em texto puro é aceita porque `AuthService.passwordMatches` compara sem hash quando o valor não começa com `$2` e regrava em BCrypt no primeiro login bem-sucedido (ver [`06-seguranca.md`](06-seguranca.md) §3.3). Isso existe para dados legados; use apenas em desenvolvimento.

> O seed não resolve esse caso: `DataSeeder` só roda com `users.count() == 0`, então um único registro existente o desliga por completo.

### 6.3 O que cada seed faz

| Serviço | Condição | Resultado |
|---|---|---|
| identity | flag + tabela vazia | 5 usuários demo. |
| tenant | flag + tabela vazia | 3 lojas com IDs fixos. |
| catalog | flag + tabela vazia | 7 pratos. |
| tenant (couriers) | sempre + primeira loja sem entregadores | 2 entregadores. |
| order (demo) | flag + tabela vazia | 2 pedidos. |
| order (sempre) | tabela vazia + tenant acessível | 1 pedido `4822`. |

### 6.4 Contas e lojas

| Papel | E-mail | Senha |
|---|---|---|
| ADMIN | `admin@delivery.com` | `admin123` |
| SUPPORT | `suporte@delivery.com` | `suporte123` |
| SELLER | `joao@pizzaria.com` | `loja123` |
| COURIER | `carlos@moto.com` | `entrega123` |
| CUSTOMER | `maria@gmail.com` | `cliente123` |

Lojas do seed: `pizzaria-do-joao`, `burger-artesanal`, `sushi-prime`. O seed só roda com o banco vazio e `APP_SEED_DEMO_DATA=true`; no ambiente local atual existe apenas `vera-marmitex` (`398935eb-36c3-4574-acbc-3b37a6cefa61`), que é o slug padrão do APK do cliente. As contas acima também dependem do seed; sem elas, cadastre um cliente em `POST /api/auth/register` com `role = CUSTOMER` para testar o app.

> Essas credenciais são públicas no código e existem apenas para desenvolvimento. Nunca as use em ambiente compartilhado.

### 6.5 Desativar

```powershell
Remove-Item Env:APP_SEED_DEMO_DATA
```

Os seeders condicionais não rodam. `StoreDataSeeder` e `OrderDataSeeder` continuam rodando; para evitar o pedido automático, mantenha a tabela `orders` com pelo menos um registro ou desabilite o seeder em código/configuração (não há flag hoje).

---

## 7. Troubleshooting

| Sintoma | Causa provável | Diagnóstico | Correção |
|---|---|---|---|
| `Connection refused` no PostgreSQL | Container parado | `docker compose ps` | `docker compose up -d postgres` |
| `database "identity_db" does not exist` | Volume antigo sem o init script | `docker exec -it delivery-postgres psql -U postgres -l` | Criar bancos manualmente ou recriar volume (destrutivo) |
| `Schema-validation: missing table` | Migração não aplicada ou banco errado | Logs do Liquibase; `databasechangelog` | Conferir `SPRING_DATASOURCE_URL` e subir o serviço |
| `Liquibase checksum validation failed` | Changeset editado após aplicação | Log do changeset | Reverter edição ou recriar o banco em dev |
| `JWT_SECRET precisa ter pelo menos 32 bytes` | Segredo curto | Log do identity/gateway | Usar segredo ≥ 32 bytes |
| `401` no admin | Token expirado, ausente ou segredo diferente | Decodificar `exp`; conferir `JWT_SECRET` | Login novamente; alinhar segredo |
| `500` no login | Credenciais inválidas (comportamento atual) | Log `Credenciais inválidas` | Conferir e-mail/senha; ver lacuna em `03-api.md` |
| `500` ao aceitar entrega | `courierId` não é UUID | Payload `courier-carlos-1` | Usar UUID válido; corrigir frontend |
| Pagamento não altera | Android envia `config`; backend lê `enabledMethods` | Network tab/log | Alinhar payload; implementar persistência |
| Seed não aparece | Flag não definida ou tabela não vazia | `count(*)`; env do processo | Definir flag e reiniciar; limpar dados |
| Order-service demora a subir | `OrderDataSeeder` tentando tenant | Log “Aguardando tenant-service” | Subir tenant antes; ou manter pedido na tabela |
| CORS bloqueado | Origem fora dos padrões | Console do navegador | Usar `localhost`/IP privado ou ajustar CORS |
| Porta em uso | Outro processo | `netstat -ano | findstr :8080` | Encerrar processo ou mudar porta (rota fixa) |
| Android não conecta | URL errada, firewall ou cleartext | Logcat | Usar `10.0.2.2`/IP correto; liberar firewall |
| Frontend chama host errado | `NEXT_PUBLIC_API_URL` não reiniciada | DevTools → Network | Reiniciar `next dev`/rebuild |
| `npm run build` falha | Lint/TypeScript | `npm run lint` | Corrigir erros |
| Twilio `503` | Credenciais ausentes ou número não verificado | Log do identity | Configurar env; verificar número no Twilio |
| Dados sumiram | Changeset `002-clear-preloaded-data` aplicado | `databasechangelog` | Restaurar backup; revisar changeset |
| Checkout retorna `409` | Sem capacidade comum na janela/dia pedidos | Resposta `SchedulingService` | Escolher outra janela, reduzir itens ou aumentar `SCHEDULING_MAX_DAYS_AHEAD` |
| Agenda sempre no fallback | Catálogo fora do ar ou prato sem `salesDaysJson`/`salesWindowsJson` | Log `Não foi possível consultar o catálogo` | Subir `catalog-service`, conferir `CATALOG_SERVICE_URL` e configurar os pratos |
| Esforço inesperado na agenda | `effortMinutes` do prato desatualizado; catálogo prevalece sobre o request | Consultar `GET /api/catalog/dishes/{id}` | Ajustar o esforço no cardápio do vendedor |
| `... não pode ser carregado porque a execução de scripts foi desabilitada` | Execution policy do Windows bloqueia `.ps1` | `Get-ExecutionPolicy` | `powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1 up` ou `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| Submódulo vazio após clonar | Clone sem `--recurse-submodules` | `git submodule status` (prefixo `-`) | `git submodule update --init --recursive` |
| `not our ref` ao inicializar submódulo | O guarda-chuva aponta para um commit que não existe no remoto do projeto | `git ls-remote <url> refs/heads/main` | Fazer push do projeto antes de commitar o ponteiro no guarda-chuva |

### 7.1 Comandos úteis

```powershell
# Processos nas portas
netstat -ano | findstr ":8080 :8081 :8082 :8083 :8084 :3000"

# Logs do PostgreSQL
docker logs delivery-postgres --tail 100

# Logs do Redpanda (se subiu tudo)
docker logs delivery-redpanda --tail 50

# Listar bancos
docker exec -it delivery-postgres psql -U postgres -c "\l"

# Conectar ao identity_db
docker exec -it delivery-postgres psql -U postgres -d identity_db

# Ver changesets
docker exec -it delivery-postgres psql -U postgres -d identity_db -c "SELECT id, exectype, dateexecuted FROM databasechangelog ORDER BY orderexecuted DESC;"
```

---

## 8. Runbooks

### RB-01 — Subir ambiente limpo

**Quando usar:** primeira execução ou ambiente corrompido.

1. `docker compose down -v` (**apaga dados**).
2. `docker compose up -d`.
3. Aguardar `pg_isready`.
4. Subir identity, tenant e catalog com `APP_SEED_DEMO_DATA=true`.
5. Subir order.
6. Subir gateway.
7. Rodar smoke test da seção 5.3.
8. Subir frontend e validar `/admin/login`.

**Verificação:** 5 health `UP`, login `200`, 3 lojas, 7 pratos.

**Rollback:** não há; o volume foi apagado.

### RB-02 — Resetar apenas os bancos

**Quando usar:** schema inconsistente em desenvolvimento.

```powershell
docker compose stop postgres
docker compose rm -f postgres
docker volume rm delivery-marketplace_postgres_data
docker compose up -d postgres
```

Confirme o nome real do volume com `docker volume ls`. **Destrutivo.**

### RB-03 — Ativar dados demo sem recriar o banco

1. Garanta que as tabelas estão vazias (`users`, `tenants`, `dishes`).
2. Defina `APP_SEED_DEMO_DATA=true` nos processos.
3. Reinicie identity, tenant e catalog.
4. Verifique os logs de seed.
5. Confirme os dados via API.

Se as tabelas não estiverem vazias, o seeder não completa dados parciais.

### RB-04 — Criar o primeiro admin manualmente

Use [`backend/identity-service/src/main/resources/db/manual/create-first-admin.sql`](../../backend/identity-service/src/main/resources/db/manual/create-first-admin.sql).

1. Substitua e-mail, senha temporária e telefone.
2. Execute conectado ao `identity_db`.
3. Faça login e troque a senha.
4. Remova o script preenchido do histórico local, se aplicável.

O script usa `pgcrypto` e BCrypt.

### RB-05 — Rotacionar o segredo JWT

1. Gere um segredo forte (≥ 32 bytes).
2. Atualize `JWT_SECRET` no gateway e no identity.
3. Reinicie os dois serviços.
4. Todos os tokens antigos passam a ser inválidos; usuários precisam logar novamente.
5. Comunique a equipe/testadores.

**Atenção:** se apenas um dos serviços for atualizado, tokens válidos serão rejeitados.

### RB-06 — Investigar um erro 500

1. Reproduza com `curl`/Swagger.
2. Identifique o serviço pelo path.
3. Verifique o log do serviço.
4. Confira payload, UUIDs, enums e existência do registro.
5. Se for `RuntimeException` não tratada, registre a lacuna em `03-api.md`.
6. Se afetar dados, faça backup antes de corrigir.

### RB-07 — Backup e restauração local

```powershell
# Backup
docker exec -t delivery-postgres pg_dumpall -U postgres > backup.sql

# Restauração (banco vazio)
Get-Content backup.sql | docker exec -i delivery-postgres psql -U postgres
```

Valide contagens e login após restaurar.

### RB-08 — Liberar acesso do Android físico

1. Descubra o IP da máquina: `ipconfig`.
2. Confirme que o celular está na mesma rede.
3. Libere a porta `8080` no firewall.
4. Rebuild com `-PAPI_BASE_URL=http://<ip>:8080/api/`.
5. Instale e faça login.
6. Se necessário, ajuste CORS (o app nativo não é afetado por CORS, mas o gateway pode ser).

### RB-09 — Limpar sessão web/Android

- Web admin: remover `deliveryhub.admin.session` do `localStorage` ou usar o logout.
- Web vendedor: remover `deliveryhub.seller.session`.
- Android: desinstalar/reinstalar ou limpar dados do app (a sessão está em `EncryptedSharedPreferences`).

### RB-10 — Verificar e corrigir dados de seed

```sql
-- identity
SELECT count(*) FROM users;
-- tenant
SELECT count(*) FROM tenants;
-- catalog
SELECT count(*) FROM dishes;
-- order
SELECT count(*) FROM orders;
```

Se houver dados parciais, avalie limpar apenas as tabelas do serviço e reiniciar com a flag.

### RB-11 — Tempo real do vendedor não atualiza

1. Confirme que o SSE responde:

```powershell
curl.exe -N -H "Accept: text/event-stream" http://localhost:8080/api/store/me/orders/stream
```

2. Crie um pedido em outro terminal e verifique se o evento aparece.
3. Se o SSE funciona mas o Redpanda não recebe, verifique o log do order-service:

```text
Não foi possível publicar o evento ... (Redpanda fora do ar?)
```

4. Confirme o broker:

```powershell
docker compose ps redpanda
docker exec -it delivery-redpanda rpk topic list
```

5. Inspecione o tópico no console: [http://localhost:8085](http://localhost:8085) → `order-events`.
6. Se o ambiente não tiver Redpanda, suba o order-service com `KAFKA_ENABLED=false`. O SSE continua funcionando.

> O SSE é mantido em memória. Se houver mais de uma instância do order-service, o vendedor só recebe eventos da instância à qual está conectado.

---

## 9. Logs e diagnóstico

### 9.1 O que existe

- Logs no console de cada serviço.
- `root: INFO`.
- `org.springframework.web: DEBUG`.
- `org.hibernate.SQL: DEBUG` e binder `TRACE`.
- `com.seuprojeto: DEBUG` (pacote genérico, provavelmente sem efeito).
- `WARN` do order-service quando o Redpanda está indisponível.

### 9.2 O que não existe

- Logs estruturados (JSON).
- Correlation ID / trace ID.
- Agregador central.
- Métricas de latência/erro.
- Alertas.
- Retenção configurada.
- Mascaramento de PII.

### 9.3 Cuidados

- `DEBUG` de SQL e binder pode expor dados pessoais em logs.
- Em produção, reduza para `INFO` e remova `TRACE`.
- Não copie logs com telefone/e-mail para tickets públicos.

---

## 10. Limitações de implantação

| Limitação | Consequência |
|---|---|
| Sem Dockerfile dos serviços/frontend | Não há imagem reproduzível. |
| Gateway com `localhost` fixo | Não funciona em containers ou cluster. |
| Sem service discovery | Escala horizontal exige configuração manual. |
| Sem TLS | Tráfego em claro; inaceitável fora de dev. |
| CORS amplo | Superfície de ataque. |
| Segredo JWT default | Risco de tokens forjados. |
| Sem migrations gate | Deploy pode subir com schema incompatível. |
| Sem healthcheck de dependências | Orquestração não sabe se o serviço está pronto. |
| Sem backup | Perda de dados em falha. |
| Sem observabilidade | Diagnóstico lento. |
| Sem rate limit | Abuso e brute force. |
| Sem pipeline | Build/test/deploy manuais. |
| Seed automático | Pode criar dados indesejados em produção. |
| SSE em memória | Não escala horizontalmente sem consumir `order-events`. |
| Kafka sem consumidor | Eventos publicados sem destino; custo operacional sem benefício imediato. |

### 10.1 Checklist mínimo antes de produção

- [ ] Substituir `JWT_SECRET` e armazená-lo em cofre.
- [ ] Habilitar HTTPS e HSTS.
- [ ] Restringir CORS a origens explícitas.
- [ ] Proteger catálogo, pedidos e store com autorização.
- [ ] Incluir `tenant_id` no JWT e filtrar consultas.
- [ ] Implementar pagamento real ou desabilitar checkout.
- [ ] Remover/condicionar seeds automáticos.
- [ ] Revisar changesets destrutivos.
- [ ] Configurar backup e teste de restauração.
- [ ] Configurar métricas, tracing, logs e alertas.
- [ ] Configurar CI/CD com testes e migrations.
- [ ] Fazer revisão de segurança e teste de carga.
- [ ] Definir política de retenção/LGPD.
- [ ] Externalizar URLs e segredos por ambiente.
- [ ] Criar runbooks de incidente e on-call.

---

## 11. Referências internas

- Arquitetura: [`02-arquitetura.md`](02-arquitetura.md)
- API: [`03-api.md`](03-api.md)
- Dados e seeds: [`04-dados.md`](04-dados.md)
- Segurança: [`06-seguranca.md`](06-seguranca.md)
- Testes: [`07-qualidade-e-testes.md`](07-qualidade-e-testes.md)
- Configuração de SMS: [`../redefinicao-senha-sms.md`](../redefinicao-senha-sms.md)
- API administrativa: [`../api-configuracoes-admin.md`](../api-configuracoes-admin.md)
