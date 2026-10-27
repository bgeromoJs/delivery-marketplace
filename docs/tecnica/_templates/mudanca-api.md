# Template — Mudança de API

| Campo | Valor |
|---|---|
| Serviço | identity / tenant / catalog / order / gateway |
| Endpoint | `MÉTODO /caminho` |
| Tipo de mudança | Aditiva / Breaking / Deprecação |
| Autor | |
| Revisores | |
| Data | AAAA-MM-DD |

## 1. Motivação

Qual problema a mudança resolve. Referencie a issue.

## 2. Contrato proposto

### Requisição

```http
POST /api/exemplo HTTP/1.1
Host: localhost:8080
Authorization: Bearer <token>
Content-Type: application/json

{
  "campo": "valor"
}
```

### Resposta de sucesso

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "00000000-0000-0000-0000-000000000000"
}
```

### Erros

| Status | Quando | Corpo |
|---|---|---|
| 400 | Validação | `{ "message": "..." }` |
| 401 | Sem token | — |
| 403 | Papel insuficiente | `{ "message": "..." }` |
| 404 | Não encontrado | `{ "message": "..." }` |
| 409 | Conflito | `{ "message": "..." }` |

## 3. Compatibilidade

| Consumidor | Impacto | Ação necessária |
|---|---|---|
| Web — admin | | |
| Web — vendedor | | |
| Web — cliente | | |
| Android | | |
| Integrações externas | | |

- [ ] A mudança é retrocompatível.
- [ ] Clientes foram atualizados no mesmo release.
- [ ] Período de transição definido (se breaking).

## 4. Autorização

| Papel | Permitido | Observação |
|---|---|---|
| Público | | |
| CUSTOMER | | |
| COURIER | | |
| SELLER | | |
| ADMIN | | |

- [ ] Regra aplicada no gateway.
- [ ] Regra aplicada no serviço (quando houver Spring Security).
- [ ] Isolamento por tenant verificado.
- [ ] Teste positivo e negativo adicionado.

## 5. Dados

- [ ] Não altera schema.
- [ ] Altera schema — changeset Liquibase anexado.
- [ ] Requer migração de dados.
- [ ] Requer índice novo.

## 6. Documentação

- [ ] `docs/tecnica/03-api.md` atualizado.
- [ ] `docs/tecnica/04-dados.md` atualizado (se schema).
- [ ] `docs/tecnica/06-seguranca.md` atualizado (se autorização).
- [ ] ADR criado (se estrutural).
- [ ] OpenAPI gerado e revisado.

## 7. Testes

- [ ] Unidade.
- [ ] Fatia MVC (`@WebMvcTest`).
- [ ] Integração.
- [ ] Contrato.
- [ ] E2E (se fluxo crítico).

## 8. Plano de implantação

Ordem de deploy, feature flag, rollback.

```text
1.
2.
3.
```

## 9. Aprovações

| Papel | Nome | Data |
|---|---|---|
| Backend | | |
| Frontend | | |
| Segurança | | |
| Produto | | |
