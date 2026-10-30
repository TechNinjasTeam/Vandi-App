# Conferência da #11 · Notificação no celular

Conferência de 29/10/2026, antes da spec. Junta o que os scouts de código, produto e design acharam ao comparar a #11 com as dependências (#8, #10), as decisões do cofre e as telas. Nada foi corrigido: cada item diz onde está e o que mudar.

## Bloqueio

A #11 não tem em que se apoiar no código:

- **#10** (chamada de retorno, Telas 10 e 11): não começou, sem sub-issues, nada na `main`.
- **#8** (chamada da ida): sub-issues #89 a #96 abertas. `services/outbound-call.ts` só existe na branch `feat/outbound-call-8`, e as funções lançam "not implemented".
- Cadeia real: **#8 → #10 → #11**. Sobram de 31/10 a 02/11 (congelamento) para a #10 e a #11 juntas.
- Código: há `app/manifest.ts` e os ícones, mas não há service worker, Serwist nem biblioteca de push no `package.json`. O tipo `PushSubscription` existe em `types.ts`, sem service nem mock.

## Divergências para corrigir

| # | Onde | O que diverge | Sugestão |
|---|---|---|---|
| 1 | Issue #11, "Depende de" | Cita só a #10. O aviso da ida (DEC-066) depende da #8. | "Depende de #8 e #10". |
| 2 | Issues #10, #11, #12; `Projeto/Backlog.md`, `Roadmap`, `Entrega 30-10` | Tratam a D06 ("Supabase entra?") como pendente. A DEC-033 já respondeu: não entra. | Trocar D06 por DEC-033. |
| 3 | `Técnico/Stack.md` | Diz "Serwist + web-push". O web-push precisa de servidor que envie, e a DEC-033 diz que não há servidor. | Tirar o web-push, ou registrar que é só depois da #12. |
| 4 | `Produto/Funcionalidades.md`, RF12 | Promete aviso "sem abrir o app". Sem servidor, isso não é possível, principalmente no iPhone. | Alinhar com a resposta da pergunta 1. |
| 5 | `CLAUDE.md` × DEC-004 | O `CLAUDE.md` diz "Push só se sobrar tempo". A DEC-004 e a #11 dizem P1, no MVP. | Alinhar os dois. |
| 6 | DEC-004, "Se a sprint 3 apertar" | Corta o avulso antes do push, mas o avulso virou base do app em 24/10 (DEC-006). | Inverter: o push sai primeiro e o link vira o caminho principal. |
| 7 | Tela `MinhaRota` (claro e escuro) | "Se você não avisar, conta que você vai.", o botão "Não vou amanhã" e o "Desfazer" são da regra antiga (DEC-003). | Redesenhar com Vou / Não vou / Sem resposta (DEC-066). |
| 8 | Tela `MinhaRotaNotificacoes` | A janela e o exemplo de notificação falam só da chamada de volta. | Incluir o aviso da ida, 24 h antes, com foco no crédito. |
| 9 | `Produto/Telas do MVP.md` × `Backlog` × DEC-004 | "No primeiro acesso" × "depois do primeiro login" × "nunca na primeira abertura". | Usar o texto da DEC-004. |
| 10 | `Projeto/Issues do GitHub.md` | Chama a #11 de "Issue 16" e a #12 de "Issue 17". | Usar a numeração do GitHub. |

## Faltam no desenho

- Como o aluno chega à janela "Ativar notificações" pela Minha rota, e como volta a ela depois de "Agora não".
- Permissão negada no navegador, e navegador sem suporte a notificação.
- Onde desligar: a janela diz "Dá pra desligar no Perfil", mas o Perfil não tem esse controle.
- Chegada à Tela 11 pela notificação: chamada encerrada, sem chamada aberta, aluno sem login.
- Tela 10: o que conta como "avisado" no "Avisamos N alunos". Os números do desenho (9 e 3) são fixos.
- Aviso da chamada da ida: não há tela nem texto.

## Perguntas em aberto

Cada uma com a resposta recomendada.

1. **A #11 entrega push de verdade ou só simulação?** Recomendado: simulação, porque sem servidor (DEC-033) não há Web Push. A simulação inclui o service worker, a janela, a permissão, a inscrição guardada no navegador, uma notificação local no mesmo celular ao abrir a chamada e, na Tela 10, o contador e o "Mandar link".
2. **Dar a D06 como respondida (DEC-033) e tirá-la das notas e issues?** Recomendado: sim.
3. **Quem tem só reserva avulsa recebe algum aviso?** Recomendado: não. A DEC-006 só fala da volta; confirmar que a ida também fica sem aviso.
4. **Quem não tem vaga fixa vê a janela de permissão?** Recomendado: não. Só quem tem vaga fixa recebe chamada.
5. **O aviso de 10 min antes da hora limite vai só para quem está Sem resposta?** Recomendado: sim.
6. **A ida tem lembrete antes das 12 h, além do aviso de abertura?** Esta pergunta já está em aberto na DEC-066. Recomendado: não no MVP.
7. **A #11 passa a depender da #8 e da #10?** Recomendado: sim.
8. **Reordenar o corte da DEC-004 e alinhar o `CLAUDE.md`?** Recomendado: se a #8 ou a #10 atrasarem, a #11 fica só com a janela e o link; e o `CLAUDE.md` passa a dizer que o push é P1 da fase 3.
9. **Qual é o texto das notificações?** Recomendado: na volta, o do desenho atual; na ida, "Responda se vai amanhã. Quem não responde fica sem crédito." (DEC-066).
10. **O aviso de edição de rota (DEC-064) entra na #11?** Recomendado: não.

## Não verificado

- A documentação do Next 16 sobre service worker: não havia `node_modules` na conferência.
- Se o Serwist funciona com o Turbopack do Next 16. Vale conferir antes do plano.
