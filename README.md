Backend de teste para deploy no Azure Functions usando TypeScript e Express.js.

## Words (novo modo)

O backend exp├Áe um m├│dulo independente para o jogo **Words** com autentica├º├úo pr├│pria, puzzles di├írios, hist├│rico paginado e um modo infinito usando o mesmo banco de dados MongoDB.

### Autentica├º├úo e vari├íveis de ambiente

- Configure no `.env` (e na Azure) os valores:

  ```
  WORDS_ADMIN_USER=admin
  WORDS_ADMIN_PASSWORD=%3x0v7STOh@d
  ```

  O backend usa esses dois valores como credencial padr├úo; basta garantir que exista um documento `WordsUser` com `name = WORDS_ADMIN_USER`.
- Para m├║ltiplas contas, defina `WORDS_CREDENTIALS` no formato `conta:senha[:userId]`, separados por v├¡rgulas. Quando `userId` n├úo for informado, o backend procura o usu├írio pelo campo `name`.
- Todas as rotas `/words` exigem HTTP Basic (`Authorization: Basic base64("conta:senha")`).
- Os palpites enviados para `/words/puzzles/daily/guess` precisam existir no arquivo `dados/words-five-letters.txt`. Esse arquivo ├® gerado pelo `npm run words:import`; caso ele fique em outro diret├│rio no deploy, defina `WORDS_DICTIONARY_PATH=/caminho/para/words-five-letters.txt`.
- A conta configurada em `WORDS_TEST_USER` (padr├úo: `WORDS_ADMIN_USER`/`admin`) funciona como ambiente de testes: n├úo acumula score/streak, n├úo aparece no ranking e o modo di├írio n├úo persiste hist├│rico, permitindo jogar novamente quantas vezes quiser.

### Cole├º├Áes principais

- `WordsUser`: `{ name, streak, score, config, timestamps }`
- `WordsPuzzle`: `{ puzzleWord, date (YYYY-MM-DD), maxAttempts, metadata }`
- `WordsUserPuzzle`: hist├│rico di├írio com `{ status, attemptsUsed, maxAttempts, score, guesses[], finishedAt }`
- `WordsBankEntry`: banco de palavras do modo infinito (`{ word, source, timestamps }`)

### Endpoints

Todos exigem `Authorization: Basic ...`.

| M├®todo | Rota                | Descri├º├úo |
| ------ | ------------------- | --------- |
| GET    | `/words/profile`    | Retorna nome, streak, score e config do usu├írio autenticado. |
| PUT    | `/words/profile/avatar` | Atualiza o avatar salvo para o usu├írio autenticado. Recebe `frogType`, `hat`, `body` e `background` como `string` ou `null` e simplesmente persiste os valores enviados (o front pode aplicar defaults quando recebe `null`). |
| GET    | `/words/history`    | Hist├│rico paginado. Query params: `page` (default 1) e `pageSize` (default 10, m├íx. 100). |
| POST   | `/words/history`    | Cria um novo registro de jogo (incrementa o streak). Corpo: `puzzleId`, `status`, `attemptsUsed`, `maxAttempts?`, `score?`, `finishedAt?`, `guesses[]` com `{ attemptNumber, guessWord, pattern, createdAt }`. |
| GET    | `/words/puzzles/daily?date=YYYY-MM-DD` | Retorna o identificador di├írio (sem revelar a palavra) dessa data ou do dia atual, incluindo o progresso salvo (tentativas j├í feitas, status, pontua├º├úo). |
| GET    | `/words/puzzles`    | Lista puzzles paginados (`page`, `pageSize`). |
| POST   | `/words/puzzles`    | Cria um puzzle `{ date, puzzleWord, maxAttempts?, metadata? }`. Datas s├úo ├║nicas. |
| POST   | `/words/puzzles/daily/guess` | Processa a tentativa di├íria sem expor a palavra. Corpo: `{ guessWord, date?, dailyId? }`. Retorna o estado de cada letra (`absent`, `present`, `correct`), o n├║mero da tentativa, tentativas restantes e a pontua├º├úo; rejeita palavras fora do dicion├írio. |
| GET    | `/words/ranking` | Lista o ranking ordenado por `score` e, em empates, pelo tempo total gasto (em ms) entre a primeira tentativa e o t├®rmino de cada daily (`totalTimeSpentMs`). |
| GET    | `/words/avatar/options` | Retorna o cat├ílogo `frogs`, `hats`, `bodies` e `backgrounds` dispon├¡veis para o avatar, permitindo que o front sincronize a lista sem redeploy. |
| GET    | `/words/infinite/random` | Retorna uma palavra aleat├│ria da cole├º├úo `WordsBankEntry`. |
| GET    | `/words/infinite/words` | Lista paginada das palavras do modo infinito (`page`, `pageSize` at├® 500). |


| POST   | /words/infinite/run | Inicia (ou recupera) a run ativa do modo infinito com 4 tentativas por palavra. |
| GET    | /words/infinite/run | Retorna o estado atual da run ativa (score, tentativas e histórico parcial). |
| POST   | /words/infinite/run/guess | Submete um palpite { guessWord } no modo infinito e devolve o estado atualizado da run. |
| POST   | /words/infinite/run/abandon | Encerra a run atual como *Game Over* e retorna o resumo + histórico da sequência. |

O campo `config.avatar` segue o formato:

```json
{
  "config": {
    "avatar": {
      "frogType": "frogo",
      "hat": "hat_02",
      "body": "body_01",
      "background": "ocean"
    }
  }
}
```

Quando o usu├írio ainda n├úo salvou um avatar, o backend retorna o `frogType` default e deixa os demais campos como `null`.

> Observa├º├úo: o backend aceita qualquer string (ou `null`) para `frogType`, `hat`, `body` e `background`. O endpoint `/words/avatar/options` serve apenas como cat├ílogo sugerido para o front sincronizar os ids conhecidos.

### Usu├írios e modo infinito: importa├º├úo e manuten├º├úo

1. Garanta o usu├írio padr├úo rodando `npm run words:seed-user` (opcionalmente passando o nome: `npm run words:seed-user -- MeuUsuario`). O script cria o documento em `WordsUser` se ele ainda n├úo existir.
2. Os arquivos base continuam em `dados/verbos.txt`, `dados/lexico.txt` e `dados/conjugacoes.txt`. Eles s├│ precisam estar dispon├¡veis localmente para gerar a lista.
3. Execute `npm run words:import` sempre que quiser atualizar o banco. O script:
   - l├¬ todos os arquivos,
   - normaliza as palavras (remove acentos/caracteres especiais, filtra apenas termos com 5 letras, converte para CAIXA ALTA),
   - substitui o conte├║do da cole├º├úo `WordsBankEntry`,
   - cria/atualiza o arquivo `dados/words-five-letters.txt` com todas as palavras v├ílidas.
4. Ap├│s importar uma vez, o ambiente de produ├º├úo n├úo precisa mais da pasta `dados/`: o backend passa a servir tudo diretamente da cole├º├úo MongoDB.

> O script usa as mesmas credenciais (`MONGODB_URI` e `MONGODB_DB`) configuradas no `.env`. Certifique-se de que o usu├írio tenha permiss├úo de escrita.

### Respostas

`GET /words/history` devolve:

```json
{
  "page": 1,
  "pageSize": 10,
  "totalPages": 3,
  "totalItems": 25,
  "items": [
    {
      "userPuzzleId": "b4c75f9a-2d5b-4b8f-9b40-5f7c3e8c9f01",
      "puzzleId": "1d9b8c23-45fa-4c66-9a14-1f9bb4f7a1cd",
      "puzzleWord": "TERMO",
      "date": "2025-11-13",
      "status": "won",
      "attemptsUsed": 4,
      "maxAttempts": 6,
      "score": 120,
      "guesses": [
        {
          "attemptNumber": 1,
          "guessWord": "CASAS",
          "pattern": "01000",
          "createdAt": "2025-11-13T12:00:10.000Z"
        }
      ],
      "createdAt": "2025-11-13T11:59:50.000Z",
      "finishedAt": "2025-11-13T12:01:00.000Z",
      "firstGuessAt": "2025-11-13T12:00:05.000Z",
      "timeSpentMs": 55000
    }
  ]
}
```

`GET /words/puzzles/daily` devolve:

```json
{
  "puzzle": {
    "id": "67238b1f9c6d72a8f484b1cf",
    "dailyId": "20251113",
    "date": "2025-11-13",
    "maxAttempts": 6
  },
  "status": "in_progress",
  "attemptsUsed": 1,
  "remainingAttempts": 5,
  "finishedAt": null,
  "scoreAwarded": 0,
  "guesses": [
    {
      "attemptNumber": 1,
      "guessWord": "PATOS",
      "pattern": "02012",
      "letters": [
        { "letter": "P", "state": "absent" },
        { "letter": "A", "state": "correct" },
        { "letter": "T", "state": "absent" },
        { "letter": "O", "state": "present" },
        { "letter": "S", "state": "correct" }
      ],
      "createdAt": "2025-11-13T12:00:10.000Z"
    }
  ]
}
```

Estados poss├¡veis: `absent` (a letra n├úo existe na palavra), `present` (existe em outra posi├º├úo) e `correct` (letra e posi├º├úo corretas). O `dailyId` sempre segue o formato `YYYYMMDD`.

`POST /words/puzzles/daily/guess` devolve:

```json
{
  "puzzle": {
    "id": "67238b1f9c6d72a8f484b1cf",
    "date": "2025-11-13",
    "dailyId": "20251113",
    "maxAttempts": 6
  },
  "attempt": {
    "attemptNumber": 1,
    "letters": [
      { "letter": "P", "state": "absent" },
      { "letter": "A", "state": "correct" },
      { "letter": "T", "state": "absent" },
      { "letter": "O", "state": "present" },
      { "letter": "S", "state": "correct" }
    ],
    "pattern": "02012"
  },
  "status": "in_progress",
  "attemptsUsed": 1,
  "remainingAttempts": 5,
  "finishedAt": null,
  "scoreAwarded": 0,
  "userScore": 40
}
```

Use `POST /words/puzzles` para cadastrar previamente todos os puzzles que ser├úo disponibilizados para os usu├írios. Depois utilize `POST /words/history` para registrar os resultados di├írios e manter o streak atualizado automaticamente.
