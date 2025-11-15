Backend de teste para deploy no Azure Functions usando TypeScript e Express.js.

## Words (novo modo)

O backend expõe um módulo independente para o jogo **Words** com autenticação própria, puzzles diários, histórico paginado e um modo infinito usando o mesmo banco de dados MongoDB.

### Autenticação e variáveis de ambiente

- Configure no `.env` (e na Azure) os valores:

  ```
  WORDS_ADMIN_USER=admin
  WORDS_ADMIN_PASSWORD=%3x0v7STOh@d
  ```

  O backend usa esses dois valores como credencial padrão; basta garantir que exista um documento `WordsUser` com `name = WORDS_ADMIN_USER`.
- Para múltiplas contas, defina `WORDS_CREDENTIALS` no formato `conta:senha[:userId]`, separados por vírgulas. Quando `userId` não for informado, o backend procura o usuário pelo campo `name`.
- Todas as rotas `/words` exigem HTTP Basic (`Authorization: Basic base64("conta:senha")`).

### Coleções principais

- `WordsUser`: `{ name, streak, score, config, timestamps }`
- `WordsPuzzle`: `{ puzzleWord, date (YYYY-MM-DD), maxAttempts, metadata }`
- `WordsUserPuzzle`: histórico diário com `{ status, attemptsUsed, maxAttempts, score, guesses[], finishedAt }`
- `WordsBankEntry`: banco de palavras do modo infinito (`{ word, source, timestamps }`)

### Endpoints

Todos exigem `Authorization: Basic ...`.

| Método | Rota                | Descrição |
| ------ | ------------------- | --------- |
| GET    | `/words/profile`    | Retorna nome, streak, score e config do usuário autenticado. |
| GET    | `/words/history`    | Histórico paginado. Query params: `page` (default 1) e `pageSize` (default 10, máx. 100). |
| POST   | `/words/history`    | Cria um novo registro de jogo (incrementa o streak). Corpo: `puzzleId`, `status`, `attemptsUsed`, `maxAttempts?`, `score?`, `finishedAt?`, `guesses[]` com `{ attemptNumber, guessWord, pattern, createdAt }`. |
| GET    | `/words/puzzles/daily?date=YYYY-MM-DD` | Retorna o identificador diário (sem revelar a palavra) dessa data ou do dia atual, incluindo o progresso salvo (tentativas já feitas, status, pontuação). |
| GET    | `/words/puzzles`    | Lista puzzles paginados (`page`, `pageSize`). |
| POST   | `/words/puzzles`    | Cria um puzzle `{ date, puzzleWord, maxAttempts?, metadata? }`. Datas são únicas. |
| POST   | `/words/puzzles/daily/guess` | Processa a tentativa diária sem expor a palavra. Corpo: `{ guessWord, date?, dailyId? }`. Retorna o estado de cada letra (`absent`, `present`, `correct`), o número da tentativa, tentativas restantes e a pontuação recebida quando o usuário acertar. |
| GET    | `/words/infinite/random` | Retorna uma palavra aleatória da coleção `WordsBankEntry`. |
| GET    | `/words/infinite/words` | Lista paginada das palavras do modo infinito (`page`, `pageSize` até 500). |

### Usuários e modo infinito: importação e manutenção

1. Garanta o usuário padrão rodando `npm run words:seed-user` (opcionalmente passando o nome: `npm run words:seed-user -- MeuUsuario`). O script cria o documento em `WordsUser` se ele ainda não existir.
2. Os arquivos base continuam em `dados/verbos.txt`, `dados/lexico.txt` e `dados/conjugacoes.txt`. Eles só precisam estar disponíveis localmente para gerar a lista.
3. Execute `npm run words:import` sempre que quiser atualizar o banco. O script:
   - lê todos os arquivos,
   - normaliza as palavras (remove acentos/caracteres especiais, filtra apenas termos com 5 letras, converte para CAIXA ALTA),
   - substitui o conteúdo da coleção `WordsBankEntry`.
4. Após importar uma vez, o ambiente de produção não precisa mais da pasta `dados/`: o backend passa a servir tudo diretamente da coleção MongoDB.

> O script usa as mesmas credenciais (`MONGODB_URI` e `MONGODB_DB`) configuradas no `.env`. Certifique-se de que o usuário tenha permissão de escrita.

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
      "finishedAt": "2025-11-13T12:01:00.000Z"
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

Estados possíveis: `absent` (a letra não existe na palavra), `present` (existe em outra posição) e `correct` (letra e posição corretas). O `dailyId` sempre segue o formato `YYYYMMDD`.

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

Use `POST /words/puzzles` para cadastrar previamente todos os puzzles que serão disponibilizados para os usuários. Depois utilize `POST /words/history` para registrar os resultados diários e manter o streak atualizado automaticamente.
