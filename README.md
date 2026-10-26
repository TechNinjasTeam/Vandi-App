# Vandi

Marketplace que conecta operadores de transporte fretado universitário e alunos de outras cidades que estudam na Facens.

> `Vandi` é o nome de trabalho do projeto. Existem outros produtos com o mesmo nome no mercado; um eventual lançamento comercial passaria por rebranding.

## O problema

Quem depende de van ou ônibus fretado para chegar na faculdade vive um descompasso entre uma oferta rígida e uma demanda que muda todo dia. O operador sai com assento vazio ou deixa aluno na mão, e toda a comunicação acontece solta em grupos de WhatsApp: quem vai hoje, quem falta, a que horas é o retorno, onde a van está.

O UniBus organiza essa conversa em um fluxo só, com os dois lados no mesmo lugar.

## Como funciona

1. O operador cadastra a rota (cidade, faculdade, dias, horários de ida e volta, número de lugares) e os pontos de embarque com horário.
2. O operador gera um link de convite da rota e cola no grupo. O aluno entra por esse link já vinculado à rota.
3. Na ida vale o opt-out: todo mundo vai por padrão, quem avisa que não vai some da lista de embarque.
4. Na volta, o operador abre a chamada de retorno com hora limite de espera. O aluno confirma, e o operador acompanha ao vivo quem já respondeu.

## Funcionalidades
 
**Operador**
- Cadastro de rota: cidade de origem, faculdade, dias, horários de ida e volta, lugares
- Cadastro de pontos de embarque com horário previsto por rota
- Importação da turma atual: cadastro dos telefones dos alunos que já atende, para que entrem aprovados ao criar a conta; link de convite pro grupo é opcional
- Aprovação ou recusa dos demais pedidos de vaga
- Lista de embarque da ida, com lugares restantes
- Chamada de retorno com hora limite e localização da van, e checklist de confirmação em tempo real
- Link alternativo da chamada, para envio manual
- Check-in de embarque
- Frequência por aluno e ocupação por viagem
- Controle de mensalidade: marcação de pago/pendente e visualização de atrasos
  
**Aluno**
- Conta criada direto no app, com e-mail, senha e telefone; fica logado no dispositivo
- Busca de vans por cidade e faculdade, com lugares e horários disponíveis, e pedido de vaga
- Visualização do ponto de embarque, horários e dados da rota
- Aviso de falta na ida
- Confirmação na chamada de retorno
- Notificação push da chamada, com permissão solicitada após o primeiro login
- Orientação de instalação na tela inicial do iPhone
**Os dois lados**
- Localização da van durante a viagem, com indicação de quando a posição foi atualizada
A lista completa de requisitos (RF01–RF18) está na documentação do projeto.

## Fora do escopo

Ficam para uma fase 2:

- Gateway de pagamento e cobrança automática da comissão
- Rastreamento em segundo plano (exige app nativo)
- App nativo / React Native
- Otimização de rota
- Chat entre operador e aluno
- Avaliação de motorista

## Modelo de receita

Comissão sobre a mensalidade paga pelo aluno ao operador. No MVP não há gateway de pagamento: a mensalidade é apenas marcada como paga ou pendente.


## Equipe

| Nome | Responsabilidade |
|------|-----------------|
| Gabriel Nunes Rodrigues| fundação e camada de dados |
| Alexander Da Silva Fernandes | telas do aluno|
| Moisés Ivanildo Ferreira | check-in, frequência e mensalidade|
| Maria Eduarda Fernandes Filhik | telas de rota, alunos e aprovação |


## Status

Em desenvolvimento.
