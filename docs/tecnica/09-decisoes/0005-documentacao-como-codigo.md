# 0005 — Documentação como código, em português

| Campo | Valor |
|---|---|
| Status | Aceito |
| Data de registro | 2026-10-26 |
| Decisores | Equipe de engenharia |
| Impacto | Processo |
| Substitui | — |
| Substituído por | — |

## Contexto e problema

A documentação existente é heterogênea:

- `README.md` descreve Spring Boot 3 e H2 como padrão, mas o código usa Spring Boot 4.1.1 e PostgreSQL;
- `docs/arquitetura.md` descreve BFFs, Kafka, Saga e serviços de pagamento que não existem;
- `docs/api-configuracoes-admin.md` e `docs/redefinicao-senha-sms.md` são precisos e úteis.

O resultado é que um novo contribuidor não sabe em qual documento confiar. Documentação desatualizada é pior que ausência de documentação: induz decisões erradas com aparência de autoridade.

> Como manter documentação técnica útil, verificável e alinhada ao código, sem criar um processo pesado que ninguém segue?

## Forças de decisão

- **F1** — O código é a única fonte de verdade confiável.
- **F2** — A equipe trabalha em português; a documentação de produto também.
- **F3** — O repositório não possui wiki, Confluence ou ferramenta externa.
- **F4** — A documentação precisa ser revisada junto com o código.
- **F5** — Padrões de mercado dão estrutura e vocabulário comum.

## Opções consideradas

### Opção 1 — Wiki externa (Confluence, Notion)

**Prós**

- Edição amigável para não técnicos.
- Busca e comentários integrados.

**Contras**

- Sincronização manual com o código.
- Sem revisão no mesmo PR.
- Sem histórico próximo do diff.
- Ferramenta adicional para manter.

### Opção 2 — Documentação como código no repositório (escolhida)

Arquivos Markdown em `docs/`, versionados, revisados em PR, com padrões explícitos.

**Prós**

- Versão da documentação igual à versão do código.
- Revisão e histórico no mesmo fluxo do código.
- Links relativos para arquivos e trechos reais.
- Sem ferramenta externa.

**Contras**

- Exige disciplina para atualizar no mesmo PR.
- Sem renderização rica por padrão.
- Busca depende do GitHub/IDE.

### Opção 3 — Documentação gerada apenas do código

OpenAPI automático, JavaDoc e comentários.

**Prós**

- Nunca desatualiza em relação ao contrato.
- Custo de manutenção baixo.

**Contras**

- Não explica decisões, contexto ou trade-offs.
- Não cobre operação, segurança ou produto.
- Não substitui guias narrativos.

## Decisão

**Escolhemos a opção 2, complementada pela opção 3 onde ela é forte.**

Diretrizes adotadas:

| Dimensão | Escolha |
|---|---|
| Idioma | Português (pt-BR) |
| Local | `docs/` no repositório |
| Formato | Markdown (CommonMark + GFM) |
| Arquitetura | arc42 + C4 |
| Organização da informação | Diátaxis (tutorial, how-to, referência, explicação) |
| Decisões | MADR 4.0 |
| Contratos | OpenAPI 3.2.x gerado por springdoc; AsyncAPI 3.x quando houver eventos |
| Normas de referência | ISO/IEC/IEEE 26511–26515, IEEE 1016-2009, ISO/IEC 25010:2023 |
| Estilo | Google Developer Documentation Style Guide + Microsoft Writing Style Guide |
| Status | Rótulos explícitos: Implementado, Parcial, Planejado, Divergente, Legado |

A documentação resultante está em [`../tecnica/`](../README.md), com padrões detalhados em [`../../padroes-documentacao.md`](../../padroes-documentacao.md).

### Regra central

> Documente o que o código faz. Se a intenção difere do código, registre a divergência — não descreva a intenção como se estivesse implementada.

## Consequências

### Positivas

- Um novo contribuidor consegue distinguir as-is de visão-alvo.
- Divergências ficam registradas e rastreáveis, não escondidas.
- Revisão de documentação acontece no mesmo PR da mudança.
- Decisões têm contexto preservado em ADRs.

### Negativas

- **Custo de manutenção.** Nove documentos numerados exigem atualização contínua.
- **Risco de nova divergência.** Sem verificação automática, links e afirmações podem envelhecer.
- **Duplicação parcial.** `03-api.md` repete o que o springdoc gera.
- **Barreira de idioma.** Contribuidores externos podem não ler português.

### Neutras

- Documentos históricos (`README.md`, `docs/arquitetura.md`) foram preservados e marcados como divergentes, em vez de reescritos.
- A documentação não substitui testes; ela explica o que os testes protegem.

## Riscos e mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Documento desatualiza após mudança de código | Alta | Médio | Checklist de PR; revisão obrigatória |
| Link quebrado após mover arquivo | Média | Baixo | Verificação de links no CI (`lychee`, `markdown-link-check`) |
| Exemplo de código divergir do real | Média | Alto | Extrair de arquivos reais; revisar em PR |
| Documentação virar marketing | Média | Alto | Rótulos de status obrigatórios; foco no código |
| Idioma excluir contribuidores | Baixa | Baixo | Resumo em inglês no README raiz (futuro) |

## Confirmação

- Todo PR que altera comportamento altera o documento correspondente.
- Nenhum documento afirma funcionalidade sem rótulo de status.
- Links relativos resolvem no GitHub.
- Um leitor consegue responder “isto está implementado?” sem abrir o código.

## Mais informações

- [`../../padroes-documentacao.md`](../../padroes-documentacao.md) — baseline de padrões e referências
- [`../README.md`](../README.md) — hub da documentação técnica
- [arc42](https://arc42.org/)
- [C4 model](https://c4model.com/)
- [Diátaxis](https://diataxis.fr/)
- [MADR](https://adr.github.io/madr/)
- [ISO/IEC/IEEE 26515:2018](https://www.iso.org/standard/70880.html)
