# Tela-exemplo: guia para tela nova

Toda tela nova começa copiando esta pasta. Abra `/example` para ver o resultado.

## Onde fica cada coisa

```text
page.tsx → use-<tela>.ts → services/*.ts → services/storage.ts → localStorage (semeado por mocks/)
```

- `page.tsx`: só desenha. Chama o hook. Nunca importa `mocks/` nem `storage.ts`.
- `use-<tela>.ts`: só guarda o estado e chama o service.
- `services/`: regra de negócio e dados.

Os 4 estados, `Result`, nomes e celular primeiro: veja o `CLAUDE.md`. Janela é `Drawer`: veja o fim de `page.tsx`. Datas: `services/clock.ts`.

Datas dos mocks são relativas: `today`, `today±N`, `next-trip` (próximo dia de viagem da rota do registro) e o sufixo `T<HH:mm>`; `seed(today)` em `services/storage.ts` resolve (DEC-038).

## Passo a passo de uma tela nova

1. Copie `app/example/` para a rota nova e renomeie o hook (`use-<tela>.ts`, `use<Tela>`). Apague este README e o `?state=` do hook: ele existe só na tela-exemplo.
2. Escreva o teste do service primeiro (`services/<x>.test.ts`) e veja falhar.
3. Implemente o service e rode `npm test -- services/<x>.test.ts` até ficar verde.
4. Ligue o hook ao service e a tela ao hook, com os 4 estados.
5. Rode `npm run lint` e `npm run build`.
6. Confira a 360 px, claro e escuro.
