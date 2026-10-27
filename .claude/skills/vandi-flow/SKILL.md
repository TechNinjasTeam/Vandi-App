---
name: vandi-flow
description: Fluxo de uma feature do Vandi-App (issue-mãe existente, prompt ou bug) até PRs abertos — três scouts em paralelo, spec e plano com contrato, UM gate por feature, sub-issues em paralelo (branch de feature + branches de stack, worktrees), revisão por sub-issue e revisão final, com decisões, spec e entrega registradas no cofre. Use para TODA demanda de feature, melhoria ou bug neste repositório.
---

# Vandi Flow

A sessão principal é o manager: conversa com o Gabriel, decide e orquestra. Não escreve código de produção nem teste; isso é dos subagentes. Faz direto só: perguntas, spec, redação de issue, commit e PR, e leitura de issues (`gh issue view/list`). Toda leitura de código, produto e design vai para os `scout-*`; toda escrita no GitHub/git (sub-issue, status, branch, worktree, push, PR) vai para `github-operator`.

**Padrões do código:** o `CLAUDE.md` (projeção da nota `Técnico/Padrões do projeto.md` do cofre): camadas `page.tsx` → hook → `services/` → `storage.ts`, nomes em inglês, só dados mockados. Não há Supabase, RLS nem migration; a issue #12 está parada em P2 e não é requisito de feature nenhuma (DEC-033).

**Cofre:** fonte da verdade de decisões e conhecimento (DEC-032), no caminho da seção Cofre do `CLAUDE.md`; chamado de `<cofre>` abaixo. Passe o caminho a todo agente que lê ou escreve nele. Sem o cofre clonado, pare e peça ao Gabriel.

## Agentes e modelos

Toda chamada `Agent` passa `model` explícito:

| Modelo | Agentes |
|---|---|
| `opus` | `planner`, `reviewer-final`, `bug-hunter` |
| `sonnet` | `scout-codigo`, `scout-produto`, `scout-design`, `test-writer`, `builder`, `mobile-qa`, `ponytail-reviewer`, `reviewer`, `github-operator`, `monge-copista` |

Cada chamada é uma instância nova. O prompt carrega tudo de que ela precisa (worktree, arquivos-alvo, trecho da spec ou do plano, critérios de aceite, tela de referência) e termina com: "se ficar em dúvida, não invente; pare e reporte com `DÚVIDA:`". Pedir relatório curto: veredito, achados, caminhos.

## Parâmetros da feature

- **Teto de paralelismo:** 5 sub-issues ativas ao mesmo tempo; as demais esperam na fila, na ordem do plano. O Gabriel ajusta no gate.

## Convenções

- Feature (branch de integração): `<type>/<scope>-<n_mãe>`, sai de `origin/main`.
- Stack (uma por sub-issue): `<type>/<scope>-<n_sub>`, sai de `origin/<feature>`, já com o contrato.
- Worktrees fora do repositório, em `../.worktrees/` (pasta irmã deste repositório): `vandi-<n_mãe>-feature` e `vandi-<n_sub>`.
- Commits em Conventional Commits, sem `Co-Authored-By`. PRs usam `.github/pull_request_template.md`, verbatim.
- Status no Project 2 (o `github-operator` move; **nunca para `Done`**):

| Momento | Status |
|---|---|
| Sub-issue criada | `To-Do` |
| Worktree criado e agente começou | `Doing` |
| PR stack → feature aberto | `Review` (o Gabriel revisa) |
| Gabriel mergeia | `Done` (Gabriel) |
| Issue-mãe | `Doing` quando o gate é aprovado; `Review` com o PR feature → main aberto; `Done` pelo Gabriel |

## Princípios do manager

- Explicite suposições e separe-as do que o Gabriel disse.
- Corte o especulativo antes do gate (precisa existir? já existe no repositório? está no MVP do `CLAUDE.md`?).
- Cada sub-issue é uma entrega pequena e revisável (uma tela, ou as funções de dados de um fluxo). **Nenhuma sub-issue toca arquivo de outra**; o que é compartilhado entra no contrato.

## Passo 1 — Levantar

- **Issue-mãe existente:** `gh issue view <n> --repo TechNinjasTeam/Vandi-App --comments`.
- **Bug:** `bug-hunter` (opus) com sintoma, ambiente e celular. Lacunas → pergunte e chame um `bug-hunter` novo. O conserto segue este fluxo como feature de uma sub-issue.
- Dispare **na mesma mensagem, em paralelo**, os três scouts, cada um com a descrição da feature:
  - `scout-codigo`: o que existe e reusa, o que falta, contrato atual, conflitos com trabalho em andamento;
  - `scout-produto`: regras, critérios de aceite, bordas, fora do escopo, perguntas em aberto, lidos da issue e do cofre (`<cofre>/Decisões/` e as notas de `Produto/`);
  - `scout-design`: para cada tela da feature, textos, campos, estados, janelas, navegação, lidos de `<cofre>/Design System/Telas/`. Passe a lista de telas e variações.
- `DÚVIDA:` no relatório de scout → responda se souber; senão resolva no grilling.

## Passo 2 — Spec e plano

1. Invoque `grilling` **só** para as perguntas em aberto dos relatórios e para as decisões que são do Gabriel: uma por vez, com a resposta recomendada. Fato descobrível: consulte, não pergunte. **Cada decisão tomada vira nota** em `<cofre>/Decisões/DEC-NNN <título>.md` (próximo número livre, modelo no índice `<cofre>/Decisões.md`) e linha no índice. Decisão que muda outra: a velha ganha `status: substituída` e `substituida_por`, nunca é apagada. Decisão aberta respondida: preencha a nota e mude o status.
2. Escreva a **spec da feature** em `<cofre>/Features/<n_mãe>-<scope>/spec.md`, usando `superpowers:brainstorming` para formalizar sem refazer as perguntas. Conteúdo: regras de negócio; estados de cada tela (vazio, carregando, erro, sucesso); funções de dados com assinatura; critérios de aceite; fora do escopo. Não invoque `writing-plans`: o plano é do `planner`.
3. `planner` (opus) com o caminho da spec, o caminho do cofre e os três relatórios. Ele salva o plano em `<cofre>/Features/<n_mãe>-<scope>/plano.md`. Ele devolve o plano com o **contrato** (tipos, assinaturas dos services, mocks, componentes compartilhados), as **sub-issues** (tipo `dados` ou `tela`, arquivos-alvo, tarefas, critérios) e a **matriz de arquivos** sem colisão. `DÚVIDA:` → resolva com o Gabriel antes do gate.

### GATE ÚNICO

Mostre de uma vez:

- a spec da feature;
- o plano, o contrato e a matriz de arquivos;
- as sub-issues: título, tipo, arquivos, tela de referência, branch, ordem na fila;
- o teto de paralelismo (padrão 5).

Pare até o Gabriel aprovar. **Nenhuma ação externa antes disso.** Depois do gate o fluxo roda sozinho até os PRs abertos e só para nos casos da tabela de erros.

Aprovado o gate, despache o `monge-copista` (sonnet) em modo `gate`, em paralelo com o Passo 3: ele commita e dá push no cofre da spec, do plano e das notas `DEC` desta feature.

## Passo 3 — Preparar

Despache `github-operator` para, nesta ordem:

1. Issue-mãe em `Doing`.
2. Criar as sub-issues (corpo e labels do plano), ligar à mãe e pôr no Project em `To-Do`.
3. Worktree da feature, a partir de `origin/main`.

Depois, despache um `builder` (sonnet) no worktree da feature com "contrato da feature" e o trecho do plano. Ele commita o contrato. Em seguida o `github-operator` dá push da feature e cria, para cada sub-issue **do teto**, a branch de stack e o worktree (com `npm ci`), movendo-as para `Doing`. As demais esperam na fila.

## Passo 4 — Construir em paralelo

Cada sub-issue avança de forma independente, no próprio worktree. Dispare na mesma mensagem a próxima etapa de todas as sub-issues ativas; quando um agente voltar, dispare a etapa seguinte daquela sub-issue e, se couber no teto, puxe a próxima da fila (o `github-operator` prepara branch e worktree dela).

### Raia dados (`services/`, incluindo `metrics.ts`)

1. `test-writer` (sonnet): `RED_FAILED` → `test-writer` novo com o motivo. Não siga sem `RED_CONFIRMED`.
2. `builder` (sonnet) com a tarefa, os testes, os critérios e a mensagem de commit.
3. Revisão (abaixo).

### Raia tela

1. `builder` com o trecho da spec, o HTML e o PNG da tela em `<cofre>/Design System/Telas/` e a tela-exemplo.
2. `mobile-qa` (sonnet), modo `tela`, com worktree, porta `3100 + (n_sub mod 100)`, tela e PNGs de referência. `CHANGES_REQUESTED` → `builder` novo com os achados e volte ao `mobile-qa` (conta como ciclo).
3. Revisão (abaixo).

Em ambas: `NEEDS_CONTEXT` / `DÚVIDA:` → responda (ou pergunte ao Gabriel) e chame um `builder` novo. `BLOCKED` → pare essa sub-issue e mostre; as outras seguem.

### Revisão da sub-issue (máximo 2 ciclos)

Diff: `git fetch origin && git diff origin/<feature>...<stack>`; passe `origin/<feature>` como base.

1. `ponytail-reviewer` (sonnet) com o diff e a spec.
2. `reviewer` (sonnet) com o diff, o plano e o contrato.
3. Ambos `APPROVED` → Passo 5.
4. Senão: `builder` novo com os achados bloqueantes (Critical/Important) dos dois, commit `fix(<scope>): address review findings` ou `refactor(<scope>): ...`. Volte ao item 1 com instâncias novas.
5. Depois do 2º ciclo ainda com bloqueante → pare **essa sub-issue** e mostre o impasse; as outras seguem.

## Passo 5 — PR de stack

1. **Pré-PR:** `builder` no worktree da sub-issue: sync com `origin/<feature>`, lint, build e testes do escopo.
2. O manager redige título (Conventional Commits) e corpo a partir de `.github/pull_request_template.md`, verbatim: `Closes #<n_sub>`; relatórios finais dos revisores (e do `mobile-qa`, nas telas) em **Como validar**; caixas marcadas só quando o item foi feito. Em **Print no celular**, liste os caminhos de `docs/prints/<n_sub>/`: o Gabriel anexa. (O `Closes` não fecha a issue sozinho, porque a base não é `main`: o Gabriel move para `Done`.)
3. `github-operator`: pré-checagem, push e `gh pr create --base <feature>`; sub-issue para `Review`.

## Passo 6 — Revisão final da feature

Quando **todas** as sub-issues tiverem o PR mergeado na feature (o Gabriel avisa):

1. `github-operator`: pré-checagem da feature contra `main`; se atrasada, `builder` faz o merge de `origin/main` e roda lint, build e testes.
2. `reviewer-final` (opus) com o diff `origin/main...<feature>`, a spec da feature, o plano, o contrato e os relatórios finais dos revisores das sub-issues. **Uma única passada.**
3. `mobile-qa` (sonnet), modo `fluxo`, percorrendo a feature de ponta a ponta no worktree da feature.
4. `monge-copista` (sonnet), modo `entrega`, **em paralelo com os dois acima**, com o caminho do cofre, a spec, o plano, o diff `origin/main...<feature>` e a lista de PRs. Ele atualiza as notas do cofre que a feature mudou, escreve `<cofre>/Features/<n_mãe>-<scope>/entrega.md` (PRs, o que divergiu da spec, notas tocadas) e commita no cofre. Quando chegarem os relatórios do `reviewer-final` e do `mobile-qa`, passe a ele os vereditos para completar `entrega.md`.
5. `reviewer-final` e `mobile-qa` `APPROVED` → Fim.
6. Achados bloqueantes → mostre ao Gabriel com a sugestão de sub-issues de correção. Ele decide o que entra; cada correção aprovada roda pelo Passo 4 em diante.

## Fim

Mostre os PRs abertos (branch, URL, sub-issue). O Gabriel revisa, testa no celular, anexa os prints, mergeia e move as sub-issues para `Done`.

**PR de feature → main, só quando o Gabriel pedir:** corpo pelo template, `Closes #<n_mãe>`, relatórios do `reviewer-final` e do `mobile-qa`. O `github-operator` abre e move a mãe para `Review`. O merge e o `Done` são do Gabriel. Worktrees só saem depois do merge, quando ele mandar.

## Erros e paradas

| Situação | Ação |
|---|---|
| Gate único | parar até o Gabriel aprovar spec, plano e contrato |
| `DÚVIDA:` de subagente | responder se souber; senão perguntar ao Gabriel |
| Revisão sem convergir em 2 ciclos | parar a sub-issue e mostrar o impasse |
| Conflito de merge | relatar e parar; sem rebase nem force push |
| Teste não falha no red | voltar ao `test-writer` |
| Plano com arquivo em duas sub-issues | voltar ao `planner`; nunca começar assim |
| `agent-browser` ausente | parar o `mobile-qa`; pedir `npm i -g agent-browser` |
| `npm ci` falha no worktree | reportar a saída; não seguir essa sub-issue |
| `gh` sem auth/acesso | parar; entregar o draft e os comandos |
| Label inexistente | avisar; não criar |
| Status não move | avisar; seguir |
| Link de sub-issue falha | avulsa com `Origem: #<n_mãe>`; avisar |
| Hook bloqueou `.env` | não contornar; usar `.env.example` |
| Cofre não clonado ou caminho ausente | parar; pedir ao Gabriel o caminho ou `git clone https://github.com/TechNinjasTeam/Vandi-Cofre.git` |
| Push do cofre rejeitado | o `monge-copista` faz `git pull --rebase` só no cofre e tenta de novo; conflito em nota → parar e mostrar |
| Design mudou no canvas | reexportar só o que mudou (`<cofre>/Design System/Telas/README.md`) e o `monge-copista` commita `docs(design): ...` no cofre |
