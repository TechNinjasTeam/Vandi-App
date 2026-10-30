# Vandi

Gestão da van fretada universitária da Facens, com foco no operador. O aluno pede vaga, avisa quando não vai e responde à chamada de retorno; o operador vê quem vai na ida e quem volta. Projeto da UPX IV (grupo Tech Ninjas), repositório `TechNinjasTeam/Vandi-App`.

## Este repositório não é da ourosafra

O `CLAUDE.md` de `Documents\GitHub` (fluxo `feature-flow`, skill `issue-control`, Project `ourosafra` #10, base `develop`) **não se aplica aqui**. Neste repositório:

- Demanda de feature, melhoria ou bug segue a skill `vandi-flow` (`.claude/skills/vandi-flow/`).
- Issues entram no Project **Vandi** da org `TechNinjasTeam`.
- PRs usam `.github/pull_request_template.md`, no lugar do template corporativo do `CLAUDE.md` global.
- Commits seguem Conventional Commits, como no global.

## Cofre

Fonte da verdade de decisões e conhecimento: repositório privado `TechNinjasTeam/Vandi-Cofre` (cofre do Obsidian), clonado em:

`../Vandi-Cofre` (pasta irmã deste repositório, em qualquer máquina)

- Decisões: uma nota por decisão em `Decisões/` (`DEC-NNN`), índice em `Decisões.md`. Antes de decidir algo de novo, leia a decisão.
- Telas: `Design System/Telas/` (HTML e PNG de cada tela, claro e escuro).
- Spec, plano e entrega de cada feature: `Features/<n>-<scope>/`.
- Este `CLAUDE.md` resume as decisões técnicas; se discordar do cofre, vale o cofre.
- O `vandi-flow` lê e escreve no cofre em toda feature, e precisa também do `agent-browser` (`npm i -g agent-browser`).
- Ao citar uma decisão (`DEC-NNN`) ou nota do cofre na conversa, mostre o link para o arquivo, relativo à raiz deste repositório e com espaço como `%20`: [DEC-006](../Vandi-Cofre/Decisões/DEC-006%20Lugar%20avulso.md).

## Escopo

Quatro fases, do fluxograma oficial (https://claude.ai/artifact/ELVbZtEY1TyumsLLTE6E4Y):

| Fase | O que resolve | Telas |
|---|---|---|
| 0 · Conta | entrar como aluno ou operador | 1 Entrar, 2 Criar conta |
| 1 · Entrada na van | o aluno acha a van, pede vaga e o operador aceita | 3 Início do operador, 4 Criar rota, 5 Pedidos de vaga, 6 Buscar vans, 7 Ver a van e pedir vaga, 8 Minha rota |
| 2 · Ida | o operador sabe quem vai amanhã | 8 Minha rota, 9 Lista de embarque |
| 3 · Volta | o operador sabe quem volta hoje | 10 Chamada de retorno, 11 Responder à chamada |

Entrega de 30/10/2026: fases 0 a 2 funcionando. Fase 3 até o congelamento em 02/11/2026; depois disso, só correção.

Pagamento do avulso é Pix **simulado** (telas Futuro A e B): só muda o status da reserva, sem dinheiro nem gateway.

Fora do MVP (não implementar): pagamento real pelo app, frota (várias vans por operador), localização da van, check-in, frequência, app nativo, chat, avaliação de motorista. Push, importação da turma e controle de mensalidade só se sobrar tempo.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Dados mockados: JSON em `mocks/`, gravação no localStorage do navegador. Supabase (Postgres, Auth, Realtime, RLS) só com a issue #12
- Tailwind 4 + shadcn/ui (Charts no painel) + lucide-react
- Vitest só em `services/`
- Deploy na Vercel

O Next 16 mudou APIs e convenções. Antes de escrever código de framework, leia o guia em `node_modules/next/dist/docs/` (ver `AGENTS.md`). Exemplo: o antigo `middleware.ts` agora é `proxy.ts`.

## Padrão único do código

Detalhe e motivos na nota `Técnico/Padrões do projeto.md` do cofre.

### Estrutura

```text
app/                  só roteamento: URL → tela
  sign-in/ sign-up/ forgot-password/
  example/            tela-exemplo: toda tela nova começa copiando ela
  operator/           layout.tsx = encaixe de <OperatorLayout>
  student/            layout.tsx = encaixe de <StudentLayout>
components/
  ui/                 shadcn, gerado: não editar à mão
  layouts/            guarda de papel + navegação de cada área
hooks/                estado de tela usado em 2+ telas
services/             regra de negócio + dados, funções simples
  storage.ts          único arquivo que toca em localStorage
  metrics.ts          métricas do painel (funções puras)
types.ts              entidades: o contrato
mocks/                JSON fictício
```

### Camadas

`page.tsx` (UI) → `use-<tela>.ts` (estado) → `services/*.ts` (regra) → `storage.ts` → localStorage, semeado por `mocks/`.

- **Tela nunca importa de `mocks/` nem de `storage.ts`.** Só chama o hook.
- **Hook só guarda estado** (carregando, vazio, erro, sucesso) e chama o service. Nasce ao lado da tela; sobe pra `hooks/` no segundo uso. Componente, igual: sobe pra `components/` no segundo uso.
- **Regra de negócio só em `services/`** (lotação, papel, dono da rota). Função exportada, sem classe, sem interface com uma implementação.
- Todo service é `async`. Leitura devolve o dado. Gravação devolve `{ ok: true, data } | { ok: false, error: string }`, com `error` em português, pronto pra tela. Nunca `throw` pra erro de regra.
- Uma função por intenção do usuário (`requestSeat`, não `insertEnrollment`). Data de "hoje" entra por parâmetro.
- Mudou a assinatura de um service? `types.ts` muda no mesmo commit.
- Telas são client components (`"use client"`): sem banco, só o navegador persiste. Quando o Supabase entrar (#12), só o miolo dos services muda, virando server action; telas e hooks ficam.

### Dados e sessão

- `storage.ts`: todo acesso com `try/catch`; sem localStorage, segue com o JSON na memória. Chave `vandi:v3:<assunto>`; mudou o formato dos mocks, sobe a versão.
- "Restaurar dados de demonstração" apaga `vandi:v3:*` e volta ao JSON.
- Três contas fictícias: operador, aluno com vaga fixa, aluno sem vaga. Conta tem `role: "operator" | "student"`. A sessão (`vandi:v3:session`) guarda só o id; o papel é lido da conta.
- A guarda fica em `components/layouts/`: sem sessão ou papel errado → `/sign-in`.

### Nomes

**Código em inglês; português só no texto que aparece na tela.** Vale pra arquivo, pasta, URL, componente, função, tipo, campo de JSON e valor de status.

- kebab-case: arquivo, pasta, URL (`boarding-list.tsx`, `/student/my-route`)
- PascalCase: componente e tipo (`RouteCard`, `Enrollment`)
- camelCase: função e campo (`requestSeat`, `occupiedSeats`); hook `useNewRoute` em `use-new-route.ts`
- snake_case: valor de status (`not_returning`)
- Texto de tela: fala com "você", frases curtas, botão com verbo ("Não vou amanhã", nunca "OK").

### Tela

- Os 4 estados: carregando (Skeleton), vazio, erro (com "Tentar de novo"), sucesso. Erro de formulário ao lado do campo.
- Uma ação principal por tela (`primary`). Cor só por token, nunca hex solto. Só shadcn e lucide-react.
- Status sempre com palavra + ícone + cor: Volto, Não volto, Sem resposta. Quem não respondeu nunca vira "Não volto".

### Modelo de dados

Rota (serviço recorrente) é diferente de Viagem (a saída de um dia, ida ou volta). Um operador com uma van. Termo novo entra neste glossário antes de entrar no código:

| Na tela | No código |
|---|---|
| Operador / Aluno | `Operator` / `Student` |
| Conta (operador ou aluno) | `Account = Operator \| Student`, role `"operator" \| "student"` |
| Rota | `Route` |
| Ponto de embarque | `BoardingPoint` |
| Matrícula (vaga fixa) | `Enrollment`: `requested`, `accepted`, `confirmed`, `declined`, `cancelled` (DEC-057) |
| Lugares ocupados | `occupiedSeats` (matrículas `accepted` e `confirmed`, DEC-058) |
| Viagem | `Trip`, `direction: "outbound" \| "return"` |
| Desempenho (painel do operador) | `Dashboard` |
| "Todas" ou uma rota (abas do painel) | `RouteFilter` |
| Sobraram / vendidos / vazios | `leftover` / `sold` / `empty` |
| Dinheiro dos avulsos | `earnings` (soma de `operatorShare`, DEC-054) |
| Melhorou / Piorou / Igual | `better` / `worse` / `same` (`Trend`) |
| Ausência ("Não vou amanhã") | `Absence` |
| Chamada de retorno | `ReturnCall`, `ReturnCallResponse` |
| Volto / Não volto / Sem resposta | `returning` / `not_returning` / `no_response` |
| Avulso ("Só um dia") | `SingleTripOffer`, `SingleTripBooking` |
| Mensalidade | `MonthlyFee` |
| Crédito (cashback do lugar revendido) | `Credit` |
| Pagamento (Pix simulado) | `pending` / `paid` / `cancelled` |
| Assinatura da notificação (push) | `PushSubscription` |

### Fora até ter motivo

Supabase, SQL, RLS e `app/actions/` (só com a #12); estado global; biblioteca de formulário; `@testing-library/react`; i18n.

### Celular primeiro

Desenhado para 390 × 844 e testado a partir de 360 px. Janela que sobe é Drawer, nunca Dialog. Nada depende de hover. Input com 16 px (abaixo disso o iPhone dá zoom). Nada clicável abaixo de 44 px.

## Comandos

```bash
npm run dev      # servidor local
npm run lint     # ESLint
npm run build    # build de produção (também checa tipos)
npm test -- <caminho>   # Vitest, sempre por caminho
npm run mocks   # gera o histórico de 8 semanas (mocks/history/)
```

## Segurança

- **O repositório é público.** Nada de segredo, chave ou dado pessoal real em código, teste, commit ou PR.
- Quando o Supabase entrar (#12): só a publishable key (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). A secret key ignora o RLS e não entra no projeto.
- `.env` nunca é lido nem editado por agente (hook em `.claude/hooks/block-env.mjs`). Variáveis novas entram no `.env.example`, com valor de exemplo.
- Dados de demonstração são fictícios.

## Git

- Base: `main`. Uma branch por issue: `<type>/<scope>-<o-que>-<n>`, 3 ou 4 palavras no total (ex.: `feat/routes-create-route-12`, `feat/home-redirect-16`).
- Commits em Conventional Commits: `<type>(<scope>): <descrição>`, imperativo, até 72 caracteres, sem ponto final, sem `Co-Authored-By`.
- PR pequeno, para `main`, com print no celular, revisado e aprovado pelo Gabriel antes do merge. Revisão em lote, terça e sexta.
- Specs e planos das features ficam no cofre (`Features/`), não neste repositório.

## Definição de pronto

- Funciona no celular (360 px) no link de preview da Vercel
- PR pequeno, com print, revisado e aprovado pelo Gabriel
- Segue a tela-exemplo; nenhuma tela importa `mocks/` ou `storage.ts`
- Issue marcada como Done no Project Vandi
