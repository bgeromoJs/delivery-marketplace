# Runbook — Título do procedimento

| Campo | Valor |
|---|---|
| Serviço | identity / tenant / catalog / order / gateway / web / android |
| Severidade | S1 / S2 / S3 / S4 |
| Tempo alvo | X minutos |
| Última revisão | AAAA-MM-DD |
| Responsável | Equipe ou papel |

## Sintoma

O que o operador observa. Inclua mensagens de erro literais, códigos HTTP e trechos de log.

```text
<log ou resposta de erro>
```

## Impacto

Quem é afetado e o que deixa de funcionar. Seja concreto: “checkout retorna 500 para todos os clientes”, não “instabilidade”.

## Diagnóstico

1. Verifique o health check:

```powershell
Invoke-RestMethod http://localhost:<porta>/actuator/health
```

2. Verifique o processo e a porta:

```powershell
Get-NetTCPConnection -LocalPort <porta> -ErrorAction SilentlyContinue
```

3. Verifique os logs recentes do serviço.

4. Confirme dependências (PostgreSQL, tenant-service, gateway, Twilio).

## Causas prováveis

| Causa | Como confirmar | Ação |
|---|---|---|
| ... | ... | ... |
| ... | ... | ... |

## Resolução

Passo a passo, com comandos copiáveis. Prefira comandos idempotentes.

```powershell
# passo 1
```

```powershell
# passo 2
```

## Verificação

Como confirmar que o serviço voltou ao normal.

```powershell
# deve retornar 200
Invoke-WebRequest http://localhost:<porta>/actuator/health
```

- [ ] Health check `UP`
- [ ] Fluxo principal funciona
- [ ] Sem erros novos nos logs por 5 minutos

## Rollback

Como desfazer a mudança que causou o incidente, se aplicável.

## Comunicação

- Quem avisar.
- O que informar.
- Quando atualizar.

## Pós-incidente

- [ ] Registrar causa raiz.
- [ ] Abrir issue de correção definitiva.
- [ ] Adicionar teste de regressão.
- [ ] Atualizar este runbook.
