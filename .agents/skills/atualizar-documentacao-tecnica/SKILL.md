---
name: atualizar-documentacao-tecnica
description: Keep docs/tecnica and docs/padroes-documentacao.md in sync with every change to the delivery marketplace code, configuration, database, API, security, operations or frontend/Android behavior. Use whenever a task modifies project files, and before finishing any implementation, review the documentation impact and update the affected documents in the same change.
---

# Atualizar documentação técnica

Esta skill garante que a documentação técnica reflita o código **no mesmo conjunto de mudanças**. A regra central:

> Toda alteração no projeto tem impacto documental. Se você mudou código, configuração, schema, contrato, dependência ou comportamento operacional, atualize o documento correspondente antes de considerar a tarefa concluída.

Documentação desatualizada é um defeito. Não descreva intenção como se estivesse implementada.

## Quando aplicar

Aplique sempre que a tarefa alterar qualquer um destes:

- endpoints, DTOs, validação ou códigos de erro;
- regras de negócio, status, cálculos ou fluxos;
- schema, changeset Liquibase, seed ou índice;
- autenticação, autorização, CORS, segredos ou retenção de dados;
- variáveis de ambiente, portas, dependências de runtime ou Docker;
- frontend web, app Android ou contrato consumido por eles;
- testes, CI, observabilidade ou processo de desenvolvimento;
- decisões estruturais ou trade-offs relevantes.

## Mapa de impacto

Atualize **todos** os documentos afetados, não apenas o mais óbvio.

| Mudança | Documentos obrigatórios |
|---|---|
| Endpoint novo/alterado, campo, payload, erro | `docs/tecnica/03-api.md` + OpenAPI gerado |
| Regra de negócio, status, fluxo | `docs/tecnica/01-visao-geral.md`, `02-arquitetura.md`, `03-api.md` (conforme o caso) |
| Tabela, coluna, índice, changeset, seed | `docs/tecnica/04-dados.md` |
| Variável de ambiente, porta, subida, dependência | `docs/tecnica/05-operacao.md` |
| Auth, papéis, token, CORS, PII, ameaça | `docs/tecnica/06-seguranca.md` |
| Teste, cobertura, CI, qualidade | `docs/tecnica/07-qualidade-e-testes.md` |
| Convenção, branch, PR, ferramenta de dev | `docs/tecnica/08-desenvolvimento.md` |
| Decisão estrutural ou trade-off | novo ADR em `docs/tecnica/09-decisoes/` + índice |
| Status de funcionalidade | `docs/tecnica/README.md` e `01-visao-geral.md` |
| Padrão editorial ou ferramenta de docs | `docs/padroes-documentacao.md` |
| Infra de mensageria/eventos | `02-arquitetura.md` §8.10 + `docs/tempo-real-pedidos.md` |

Se a mudança afetar um documento de apoio existente (`docs/api-configuracoes-admin.md`, `docs/redefinicao-senha-sms.md`, `docs/tempo-real-pedidos.md`), atualize-o também.

## Procedimento

1. **Antes de codar**, identifique no mapa acima quais documentos serão afetados.
2. **Durante a mudança**, colete evidências reais: nomes de classes, caminhos, assinaturas, SQL, variáveis e respostas.
3. **Ao terminar**, atualize cada documento afetado:
   - ajuste o texto para o comportamento real;
   - atualize exemplos e trechos de código;
   - ajuste links e âncoras;
   - atualize `Última revisão` no cabeçalho do documento e no hub, se o escopo mudou.
4. **Registre divergências** em vez de mascarar: se o código não faz o que o documento dizia, marque `Divergente` e explique.
5. **Se for decisão estrutural**, crie ADR com o template `docs/tecnica/_templates/adr.md` e adicione ao índice.
6. **Valide** links, âncoras, Mermaid e afirmações antes de finalizar.
7. **Relate** no resumo final quais documentos foram atualizados e por quê.

## Rótulos de status

Use exatamente estes, em negrito:

| Rótulo | Uso |
|---|---|
| **Implementado** | Existe no código e é exercitado pelo runtime |
| **Parcial** | Existe com limitação relevante |
| **Planejado** | Não existe; é intenção ou roadmap |
| **Divergente** | Documento histórico ou interface contradiz o código |
| **Legado** | Mantido por compatibilidade, sem uso atual |

Nunca use “implementado” para algo que só existe em documentação, mock, seed ou memória.

## Regras editoriais

- Português (pt-BR), voz ativa, frases curtas.
- Um assunto por documento; não pule níveis de heading.
- Todo bloco de código declara a linguagem.
- Links internos relativos; externos absolutos e para fonte primária.
- Não copie segredos, tokens, senhas ou PII real em exemplos.
- Não duplique a OpenAPI inteira em Markdown; documente decisões, lacunas e exemplos.
- Prefira afirmar com evidência: cite arquivo, classe, método ou configuração.
- Ao mover/renomear documento, corrija todos os links de entrada e o hub.

## Checklist por tipo de mudança

### API

- [ ] `03-api.md` tem método, caminho, auth, sucesso, erros e exemplo.
- [ ] Autorização do endpoint está na matriz de `06-seguranca.md`.
- [ ] Campos removidos/renomeados foram tratados como breaking change.
- [ ] OpenAPI gerado foi conferido (`/v3/api-docs`).

### Dados

- [ ] `04-dados.md` descreve tabela/coluna/índice.
- [ ] Changeset Liquibase tem `id`, `author` e `rollback`.
- [ ] Seeds e dados demo refletem a mudança.
- [ ] Impacto em LGPD/retenção foi avaliado.

### Operação

- [ ] `05-operacao.md` lista variável, default e serviço.
- [ ] Portas e dependências estão atualizadas.
- [ ] Health check e troubleshooting continuam válidos.
- [ ] Runbook novo/ajustado quando o procedimento mudou.

### Segurança

- [ ] `06-seguranca.md` reflete o controle real.
- [ ] Matriz de autorização foi atualizada.
- [ ] Riscos e checklist de hardening foram reavaliados.
- [ ] Nenhum segredo foi adicionado ao repositório.

### Arquitetura

- [ ] `02-arquitetura.md` (C4, fluxos, containers) está coerente.
- [ ] ADR criado se a decisão for estrutural.
- [ ] Status em `README.md` e `01-visao-geral.md` atualizado.

### Frontend/Android

- [ ] `03-api.md` reflete o contrato realmente consumido.
- [ ] `01-visao-geral.md` reflete a capacidade entregue.
- [ ] `06-seguranca.md` reflete sessão/token quando mudar.
- [ ] Divergências web ↔ Android estão registradas.

## Validação

Execute antes de concluir:

```powershell
# 1. Links e âncoras: liste os links relativos e confira os destinos
Select-String -Path docs\tecnica\*.md,docs\tecnica\09-decisoes\*.md -Pattern '\]\([^)]+\.md' |
  Select-Object Path, LineNumber, Line

# 2. Arquivos referenciados que não existem
Get-ChildItem docs\tecnica -Recurse -Filter *.md |
  Select-String -Pattern '\]\((?!https?:)[^)]+\)' |
  ForEach-Object { $_.Line }

# 3. Mermaid: renderize no GitHub/IDE ou valide com mermaid-cli, se disponível
npx -y @mermaid-js/mermaid-cli --version

# 4. Consistência de status
Select-String -Path docs\tecnica\*.md -Pattern 'Planejado|Parcial|Implementado|Divergente|Legado'
```

Verifique manualmente:

- [ ] Toda âncora `#...` corresponde a um heading existente.
- [ ] Todo caminho de código citado existe.
- [ ] Diagramas Mermaid têm sintaxe válida.
- [ ] Datas de revisão atualizadas.
- [ ] Nenhuma afirmação de funcionalidade sem status.
- [ ] Nenhum segredo ou dado pessoal no diff.

## Critérios para criar ADR

Crie ADR quando a mudança:

- escolhe tecnologia, biblioteca ou protocolo estrutural;
- altera fronteira entre serviços ou modelo de dados;
- muda autenticação, autorização ou isolamento multi-tenant;
- troca um padrão de comunicação (síncrono ↔ assíncrono);
- introduz dívida técnica deliberada;
- reverte ou substitui decisão anterior.

Não crie ADR para bugfix, refatoração local, ajuste de texto ou configuração trivial.

## Anti-padrões

| Não faça | Faça |
|---|---|
| Descrever o roadmap como se existisse | Marcar **Planejado** e apontar a origem |
| Copiar o README raiz sem verificar | Confirmar no código antes de repetir |
| Atualizar só `03-api.md` | Percorrer o mapa de impacto |
| “Corrigir” o texto para uma intenção não implementada | Registrar **Divergente** |
| Deixar exemplo de payload inventado | Extrair de DTO/controller real |
| Editar um ADR aceito | Criar novo ADR e marcar o anterior como substituído |
| Mencionar segredo real | Usar placeholder óbvio |

## Definição de pronto documental

A tarefa só termina quando:

- [ ] Todos os documentos do mapa de impacto foram revisados.
- [ ] Afirmações novas foram verificadas contra o código.
- [ ] Links, âncoras e Mermaid estão válidos.
- [ ] Status e datas estão corretos.
- [ ] ADR foi criado/atualizado quando aplicável.
- [ ] O resumo final informa o que mudou na documentação.

## Referências no repositório

- Hub: `docs/tecnica/README.md`
- Padrões: `docs/padroes-documentacao.md`
- API: `docs/tecnica/03-api.md`
- Dados: `docs/tecnica/04-dados.md`
- Operação: `docs/tecnica/05-operacao.md`
- Segurança: `docs/tecnica/06-seguranca.md`
- Testes: `docs/tecnica/07-qualidade-e-testes.md`
- Desenvolvimento: `docs/tecnica/08-desenvolvimento.md`
- ADRs: `docs/tecnica/09-decisoes/README.md`
- Templates: `docs/tecnica/_templates/`
