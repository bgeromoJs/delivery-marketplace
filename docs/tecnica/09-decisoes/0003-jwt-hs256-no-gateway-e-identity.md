# 0003 — JWT HS256 emitido no identity e validado no gateway

| Campo | Valor |
|---|---|
| Status | Aceito |
| Data de registro | 2026-10-26 |
| Decisores | Equipe de arquitetura (registro retroativo) |
| Impacto | Segurança |
| Substitui | — |
| Substituído por | — |

## Contexto e problema

Com múltiplos clientes (web, Android) e múltiplos serviços, é necessário um mecanismo de autenticação que:

- não exija sessão no servidor;
- funcione igual para navegador e app nativo;
- permita ao gateway decidir acesso sem consultar o identity a cada requisição;
- seja simples o suficiente para um sistema em estágio inicial.

> Como autenticar requisições entre clientes e serviços sem estado compartilhado e sem acoplar o gateway a uma chamada remota por requisição?

## Forças de decisão

- **F1** — Web e Android consomem a mesma API pelo gateway.
- **F2** — Evitar sessão em memória, que impede escala horizontal.
- **F3** — Latência: o gateway não deve consultar o identity a cada request.
- **F4** — Simplicidade: uma única chave compartilhada, sem PKI.
- **F5** — O claim `role` precisa ser consumido por expressões de autorização do Spring Security.

## Opções consideradas

### Opção 1 — Sessão opaca com cookie

**Prós**

- Revogação trivial.
- Token não exposto a JavaScript (`HttpOnly`).
- Modelo consolidado para web.

**Contras**

- Exige armazenamento de sessão (Redis, que está provisionado mas sem uso).
- Problemático para o Android, que não gerencia cookies naturalmente.
- CSRF passa a ser uma preocupação.

### Opção 2 — JWT HS256 com segredo compartilhado (escolhida)

Identity assina; gateway e identity validam com a mesma chave simétrica. Claims: `iss`, `iat`, `exp`, `sub`, `email`, `role`. TTL de 60 minutos.

**Prós**

- Sem estado no servidor.
- Validação local no gateway, sem chamada remota.
- Funciona igual para web e Android.
- Implementação direta com Spring Security OAuth2 Resource Server.

**Contras**

- Revogação individual impossível antes do `exp`.
- Segredo compartilhado: comprometer um serviço compromete ambos.
- Sem `aud`, sem `kid`, sem rotação.
- `localStorage` no web expõe o token a XSS.

### Opção 3 — JWT RS256 com chave assimétrica

Identity assina com chave privada; serviços validam com chave pública (JWKS).

**Prós**

- Serviços validam sem conhecer o segredo de assinatura.
- Rotação viável com `kid`.
- Padrão para múltiplos validadores.

**Contras**

- Mais peças: par de chaves, endpoint JWKS, cache de chaves.
- Custo maior para o estágio atual.
- Não é o que o código implementa.

### Opção 4 — OAuth2/OIDC com provedor externo (Keycloak, Auth0)

**Prós**

- MFA, consentimento, recuperação de senha e rotação prontos.
- Padrões consolidados.

**Contras**

- Dependência externa e custo.
- O domínio exige regras próprias (vínculo com loja, reset por SMS).
- Migração grande para o estágio atual.

## Decisão

**Escolhemos a opção 2.**

A emissão está em [`AuthService.generateToken`](../../../backend/identity-service/src/main/java/com/delivery/identity/service/AuthService.java):

```java
JwtClaimsSet claims = JwtClaimsSet.builder()
        .issuer(tokenIssuer)
        .issuedAt(issuedAt)
        .expiresAt(issuedAt.plus(tokenTtlMinutes, ChronoUnit.MINUTES))
        .subject(user.getId().toString())
        .claim("email", user.getEmail())
        .claim("role", user.getRole().name())
        .build();
JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
```

A validação no gateway usa `NimbusJwtDecoder` com validação de emissor e expiração, e converte `role` em `ROLE_*`:

```java
authorities.setAuthoritiesClaimName("role");
authorities.setAuthorityPrefix("ROLE_");
```

O segredo vem de `JWT_SECRET` e o startup falha se tiver menos de 32 bytes.

## Consequências

### Positivas

- Gateway decide autorização sem chamada de rede.
- Mesmo mecanismo para web e Android.
- Claims suficientes para as regras atuais de `ADMIN`.
- Configuração pequena e compreensível.

### Negativas

- **Sem revogação.** Logout é apenas no cliente; o token vale até expirar.
- **Sem refresh token.** Após 60 minutos, o usuário precisa logar de novo.
- **Sem `tenantId` no token.** Os serviços não sabem a qual loja o usuário pertence — e o `/api/store/**` resolve pelo primeiro tenant ativo, o que é uma falha de isolamento.
- **Sem `aud`.** Um token de outra aplicação com o mesmo segredo seria aceito.
- **Segredo padrão no repositório.** Sem `JWT_SECRET`, o sistema sobe com um valor público.
- **Mesmo segredo protege códigos de reset de senha** (HMAC como pepper).
- **Somente gateway e identity validam.** Tenant, catalog e order não têm Spring Security.

### Neutras

- O token é enviado no header `Authorization: Bearer`, não em cookie; CSRF não se aplica hoje.
- A expiração é validada no cliente web apenas para UX; o servidor é a autoridade.

## Riscos e mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Segredo padrão em produção | Alta | Crítico | Falhar o startup sem `JWT_SECRET`; varredura no CI |
| Token roubado via XSS | Média | Alto | Migrar para cookie `HttpOnly` ou CSP rígida; reduzir TTL |
| Impossibilidade de revogar | Média | Alto | Refresh token + denylist; rotação de segredo |
| `tenantId` ausente | Alta | Crítico | Adicionar claim e derivar tenant no servidor |
| Serviços sem validação | Alta | Crítico | Adicionar resource server nos três serviços de domínio |

## Confirmação

- `JWT_SECRET` definido em todos os ambientes e nunca versionado.
- Token sem `role` é rejeitado em rotas administrativas.
- Token expirado retorna `401`.
- Nenhum serviço aceita identidade fornecida por header customizado.

## Mais informações

- [`06-seguranca.md`](../06-seguranca.md) — modelo completo e lacunas
- [`03-api.md`](../03-api.md) — endpoint de login e formato do token
- [RFC 7519 — JWT](https://www.rfc-editor.org/rfc/rfc7519)
- [RFC 8725 — JWT BCP](https://www.rfc-editor.org/rfc/rfc8725)
- [Spring Security — OAuth2 Resource Server](https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/index.html)
