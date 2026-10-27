# 0001 — Microsserviços com API Gateway central

| Campo | Valor |
|---|---|
| Status | Aceito |
| Data de registro | 2026-10-26 |
| Decisores | Equipe de arquitetura (registro retroativo) |
| Impacto | Estrutural |
| Substitui | — |
| Substituído por | — |

## Contexto e problema

O produto atende quatro perfis (cliente, vendedor, entregador e administrador) com domínios que evoluem em ritmos diferentes: identidade e permissões, lojas e tema, catálogo e pedidos. Um monólito único acoplaria essas áreas e dificultaria mudanças isoladas.

Ao mesmo tempo, os clientes (web e Android) precisam de um endereço estável, CORS resolvido em um só lugar e uma visão agregada da API para documentação.

> Como organizar o backend para permitir evolução independente por domínio sem multiplicar a complexidade nos clientes?

## Forças de decisão

- **F1** — Domínios com ciclos de vida distintos (identidade muda menos que catálogo).
- **F2** — Necessidade de um ponto único de entrada para web e Android.
- **F3** — Equipe pequena; complexidade operacional precisa ser contida.
- **F4** — Documentação OpenAPI agregada para revisão e testes manuais.
- **F5** — Ambiente local precisa subir sem orquestrador.

## Opções consideradas

### Opção 1 — Monólito modular

Um único processo Spring Boot com pacotes por domínio.

**Prós**

- Um deploy, um banco, uma configuração.
- Transações locais entre domínios.
- Depuração simples.

**Contras**

- Acoplamento de release entre áreas.
- Escala vertical apenas.
- Contraria a estrutura já existente no repositório.

### Opção 2 — Microsserviços com API Gateway (escolhida)

Cinco processos independentes: `api-gateway`, `identity-service`, `tenant-service`, `catalog-service` e `order-service`.

**Prós**

- Deploy e evolução independentes por domínio.
- Falha isolada: catálogo fora do ar não derruba autenticação.
- Gateway centraliza CORS, autenticação e Swagger.
- Alinhado ao organograma de responsabilidades.

**Contras**

- Sem transação distribuída; consistência eventual manual.
- Depuração atravessa processos.
- Exige disciplina de contrato e observabilidade.
- Cinco configurações para manter.

### Opção 3 — Microsserviços com service mesh e discovery

Kubernetes + Istio + Eureka/Consul.

**Prós**

- Descoberta automática, retry, mTLS, balanceamento.
- Padrão de mercado para muitas equipes.

**Contras**

- Custo operacional desproporcional ao estágio atual.
- Exige infraestrutura que o repositório não possui.
- Curva de aprendizado alta para o ganho imediato.

## Decisão

**Escolhemos a opção 2.**

O repositório implementa cinco módulos Maven independentes, agregados por [`backend/pom.xml`](../../../backend/pom.xml), com o gateway como única entrada prevista. A escolha privilegia isolamento de domínio com o menor custo operacional possível, adiando service mesh e discovery.

Configuração real do gateway em [`application.yml`](../../../backend/api-gateway/src/main/resources/application.yml):

```yaml
routes:
  - id: identity-service
    uri: http://localhost:8081
    predicates:
      - Path=/api/auth/**
  - id: store-catalog
    uri: http://localhost:8083
    predicates:
      - Path=/api/store/me/dishes/**
  # ...
```

O gateway usa **Spring Cloud Gateway MVC** (stack servlet), não a variante reativa. Os serviços são acessíveis diretamente em suas portas, o que é conveniente no desenvolvimento e perigoso fora dele.

## Consequências

### Positivas

- Cada serviço tem seu próprio `pom.xml`, porta, banco e ciclo de release.
- O Swagger agregado (`/swagger-ui.html`) reúne as quatro especificações.
- CORS é resolvido apenas no gateway.
- Um serviço pode ser reiniciado sem afetar os demais.

### Negativas

- **Rotas fixas em `localhost`.** O gateway não funciona em containers sem alteração de configuração (ver [`05-operacao.md`](../05-operacao.md#10-limitações-de-implantação)).
- **Sem descoberta de serviço.** Adicionar uma instância exige editar YAML.
- **Sem retry, circuit breaker ou rate limit.** Uma falha transitória chega ao cliente.
- **Sem transação distribuída.** `OrderDataSeeder` e criação de pedido fazem chamadas HTTP sem compensação.
- **Superfície de ataque ampliada.** Serviços sem Spring Security expostos nas portas `8082`–`8084` (ver [`06-seguranca.md`](../06-seguranca.md#2-superfície-de-ataque)).
- **Duplicação de configuração.** Logging, Actuator e datasource repetidos em cinco arquivos.

### Neutras

- O gateway também agrega OpenAPI por meio de rotas `docs-*` com `RewritePath`.
- Não há BFF por perfil; web e Android consomem os mesmos endpoints.

## Riscos e mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Gateway vira ponto único de falha | Média | Alto | Múltiplas instâncias atrás de balanceador; health checks |
| Rotas fixas impedem deploy containerizado | Alta | Alto | Externalizar URIs por variável de ambiente; service discovery |
| Serviços internos expostos | Alta | Crítico | Publicar apenas `8080`; rede interna; resource server em cada serviço |
| Contrato quebra entre serviços | Média | Alto | Testes de contrato e versionamento de API |
| Falta de tracing dificulta incidentes | Alta | Médio | OpenTelemetry + `traceId` propagado |

## Confirmação

A decisão está sendo seguida quando:

- Um novo domínio é adicionado como módulo Maven próprio, com porta e banco separados.
- Nenhum cliente acessa `8081`–`8084` diretamente em ambiente publicado.
- O gateway permanece sem regra de negócio; apenas roteia, autentica e aplica CORS.

## Mais informações

- [`02-arquitetura.md`](../02-arquitetura.md) — visão C4 e fluxos
- [`05-operacao.md`](../05-operacao.md) — subida e limitações de implantação
- [`06-seguranca.md`](../06-seguranca.md) — fronteiras de confiança
- [Spring Cloud Gateway](https://docs.spring.io/spring-cloud-gateway/reference/)
- [Microservices — Martin Fowler](https://martinfowler.com/articles/microservices.html)
