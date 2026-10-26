# Tela-exemplo: guia para tela nova

Toda tela nova começa copiando esta pasta. Abra `/example` para ver o resultado.

## Onde fica cada coisa

```text
page.tsx → use-<tela>.ts → services/*.ts → services/storage.ts → localStorage (semeado por mocks/)
```

- `page.tsx`: só desenha. Chama o hook. Nunca importa `mocks/` nem `storage.ts`.
- `use-<tela>.ts`: só guarda o estado (carregando, erro, vazio, sucesso) e chama o service.
- `services/`: regra de negócio e dados. Funções `async` simples, sem classe.
- `services/storage.ts`: o único arquivo que toca no localStorage.

## Os 4 estados

Toda tela tem os quatro: **carregando** (Skeleton do formato do conteúdo), **vazio** (cartão tracejado), **erro** (Alert `destructive` + "Tentar de novo") e **sucesso**. Erro de formulário aparece ao lado do campo.

## Gravações devolvem `Result`

Leitura devolve o dado. Gravação devolve `Result<T>`: `{ ok: true, data }` ou `{ ok: false, error }`, com `error` em português, pronto para a tela. Erro de regra nunca é `throw`.

## Datas

- "Hoje" entra por parâmetro: o hook pega `getToday()` e passa ao service.
- "Próximo dia de viagem" vem de `getNextTripDate(weekdays, today)`. Os dois estão em `services/clock.ts`.
- Mock novo usa data relativa: `today`, `today+2`, `today-1T19:30`, `next-trip` (só em registro com `routeId`). O `seed` troca pelo dia real.

## Janela: Drawer, nunca Dialog

Janela que sobe da base da tela é `Drawer`. Veja o exemplo no fim de `page.tsx`.

## Passo a passo de uma tela nova

1. Crie a branch `<type>/<scope>-<o-que>-<n>` (ex.: `feat/requests-accept-5`).
2. Copie `app/example/` para a rota nova e renomeie o hook (`use-<tela>.ts`, `use<Tela>`). Apague este README e o `?state=` do hook: ele existe só na tela-exemplo.
3. Escreva o teste do service primeiro (`services/<x>.test.ts`) e veja falhar.
4. Implemente o service e rode `npm test -- services/<x>.test.ts` até ficar verde.
5. Ligue o hook ao service e a tela ao hook, com os 4 estados.
6. Rode `npm run lint` e `npm run build`.
7. Confira a 360 px, claro e escuro.
