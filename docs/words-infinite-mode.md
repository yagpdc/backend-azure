# Words – Infinite Mode (Run) Design

## Objetivo
Implementar um modo infinito em que o jogador enfrenta uma sequência ("run") de palavras aleatórias com as seguintes regras:

- Máximo de **5 tentativas** por palavra.
- Cada acerto soma pontos na run atual; ao errar, a run termina, o score volta para zero e o recorde é atualizado.
- Nenhuma palavra se repete dentro da mesma run; se todas forem usadas, o modo termina.
- Ao perder, o backend devolve o histórico completo da run (palavra, tentativas, resultado) para que o front exiba a tela de *Game Over*.
- A cada vitória o jogador recebe outra palavra aleatória válida.
- A pontuação é binária: interessa apenas se acertou ou errou, independentemente da tentativa em que ocorreu.
- Todas as palavras devem vir de `dados/palavras_5_letras.txt`.

## Modelos / Coleções

### 1. `WordsInfiniteRun`
Representa uma run ativa ou finalizada.

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `userId` | ObjectId (ref. `WordsUser`) | Dono da run. |
| `status` | `"active" | "completed" | "failed"` | Estado da run. |
| `currentScore` | Number | Pontuação acumulada na run atual. |
| `bestScore` | Number | Maior pontuação histórica do usuário (duplicada aqui para auditoria). |
| `remainingWords` | `[String]` | Palavras ainda disponíveis para sorteio (pré-carregadas a partir do arquivo). |
| `usedWords` | `[String]` | Palavras já usadas na run para evitar repetição. |
| `history` | Array | Cada item contém `{ word, result: "won"|"lost", attemptsUsed, guesses[] }`. |
| `nextWord` | String | Palavra que o usuário precisa adivinhar agora. |
| `attemptsUsed` | Number | Tentativas já gastas na palavra atual (0–5). |
| `createdAt/updatedAt` | Date | Timestamps. |

### 2. `WordsUser` (campos novos)
- `infiniteRecord` (Number) – maior score já atingido em runs infinitas.
- `infiniteCurrentScore` (Number) – score da run em andamento (0 quando não há run).
- `infiniteStatus` (String) – `"idle" | "active" | "failed" | "completed"` para simplificar o cabeçalho de perfil.

> Esses campos são opcionais, preservando o comportamento atual de streak/score diário.

## Serviços e Regras

### Dicionário
- Criar `WordsInfiniteDictionaryService` reaproveitando a leitura de `dados/palavras_5_letras.txt` (ou injetando o caminho no serviço atual). Esse serviço expõe:
  - `getAllWords()` – retorna lista de palavras em CAIXA ALTA.
  - `getRandomWord(excluded: Set<string>)` – retorna uma palavra aleatória que **não** esteja no conjunto `excluded`.

### `WordsInfiniteRunService`
Responsável por criar runs, processar palpites e finalizar partidas.

Fluxo:
1. **Iniciar/continuar run (`startRun`)**
   - Se houver run ativa, apenas devolve o estado.
   - Caso contrário, cria um documento com `remainingWords` embaralhadas a partir do dicionário inteiro e seleciona a primeira palavra para `nextWord`.
   - Zera `currentScore` e atualiza o usuário (`infiniteCurrentScore = 0`, `infiniteStatus = "active"`).
2. **Enviar palpite (`submitGuess`)**
   - Valida se a palavra existe no dicionário e compara com `nextWord`.
   - Incrementa `attemptsUsed`. Se acertar:
     - Registra no `history` com `result = "won"`.
     - Incrementa `currentScore` e `WordsUser.infiniteCurrentScore`.
     - Atualiza `infiniteRecord` se necessário.
     - Sorteia nova palavra entre `remainingWords` (remove da lista, move para `usedWords`). Se não houver mais palavras, marca run como `completed`.
   - Se errar e atingir 5 tentativas:
     - Registra no `history` com `result = "lost"`.
     - Marca run como `failed`, zera `infiniteCurrentScore` e mantém `infiniteRecord`.
     - Retorna payload de *Game Over* com o histórico.
   - Caso contrário, devolve apenas o estado parcial.
3. **Finalizar manualmente (`abandonRun`)**
   - Permite ao jogador desistir. Marca run como `failed`, reseta score e devolve histórico parcial.

Todos os métodos usam `WordsDictionaryService` para validar palpites.

## Endpoints

| Método | Rota | Descrição |
| --- | --- | --- |
| `POST` | `/words/infinite/run` | Inicia ou retorna a run ativa. Sem corpo. |
| `GET` | `/words/infinite/run` | Obtém o estado atual (modo espectador). |
| `POST` | `/words/infinite/run/guess` | Envia palpite `{ "guessWord": "XXXXX" }`. |
| `POST` | `/words/infinite/run/abandon` | Abandona a run atual e devolve histórico. |

### Responses principais
```json
{
  "runId": "6744e7...",
  "status": "active",
  "currentScore": 3,
  "record": 10,
  "remainingWords": 2186,
  "attemptsUsed": 2,
  "maxAttempts": 5,
  "nextWord": {
    "length": 5,
    "letters": ["", "", "", "", ""]
  },
  "history": [
    {
      "order": 1,
      "word": "GEMER",
      "result": "won",
      "attemptsUsed": 3
    }
  ]
}
```

Quando `status = "failed"` ou `"completed"`, incluir `summary`:
```json
{
  "status": "failed",
  "summary": {
    "score": 7,
    "record": 12,
    "wordsPlayed": 7,
    "wordsRemaining": 2189 - 7
  },
  "history": [
    {
      "word": "GEMER",
      "result": "won",
      "attemptsUsed": 3,
      "guesses": [
        { "guessWord": "SORTE", "pattern": "01020" },
        ...
      ]
    },
    {
      "word": "TERCO",
      "result": "lost",
      "attemptsUsed": 4,
      "guesses": [...]
    }
  ]
}
```

## Integração Front-end

1. **Início da run**
   - Chamar `POST /words/infinite/run`.
   - Renderizar HUD com `currentScore`, `record` e contador de palavras restantes.
2. **Loop de palpites**
   - Enviar `POST /words/infinite/run/guess`.
   - Backend responde com:
     - `status = "active"`: continuar exibindo tentativas.
     - `status = "completed"`: mostrar tela de conclusão e permitir reiniciar.
     - `status = "failed"`: mostrar tela de *Game Over* usando `history`.
3. **Game Over**
   - Exibir lista de palavras (na ordem) com resultado.
   - Oferecer botão “Jogar novamente” => `POST /words/infinite/run`.
4. **Abandono**
   - Se o usuário desistir, chamar `POST /words/infinite/run/abandon` e tratar como *Game Over*.

### Estados no UI
- **Active**: entrada de palavrão liberada; HUD indica "Tentativas X/4".
- **Completed**: overlay com mensagem “Você completou todas as palavras disponíveis!” e CTA para reiniciar (reset).
- **Failed**: overlay com pontuação e histórico.

### Cache de Palavras
O front não precisa conhecer a palavra alvo; apenas envia palpites. Para economizar requests:
- Manter o estado retornado pelo backend (score, tentativas, etc.) em memória/local storage.
- Caso a sessão expire, basta chamar `GET /words/infinite/run` para renderizar o estado salvo no servidor.

## Passos de Implementação

1. **Modelos**
   - Criar `src/models/words-infinite-run.ts` e registrar os campos descritos.
   - Atualizar `src/models/words-user.ts` com os novos campos (`infiniteRecord`, `infiniteCurrentScore`, `infiniteStatus`).
2. **Serviços**
   - `WordsDictionaryService`: expor método para listar todas as palavras (será consumido pelo novo serviço).
   - Criar `WordsInfiniteRunService` com métodos `startRun`, `getRun`, `submitGuess`, `abandonRun`.
   - Atualizar `WordsUsersService` para lidar com os campos extras.
3. **Controller / Rotas**
   - Em `src/routes/words.routes.ts`, registrar as novas rotas e métodos correspondentes no `WordsController`.
   - Mapear as respostas usando helpers (similar ao modo diário).
4. **Validações**
   - Criar schemas Zod para `GuessInfiniteWordDto` etc.
   - Reaproveitar o avaliador de palpites já usado no modo diário (`evaluateGuess`).
5. **Scripts / dados**
   - Garantir que `words-five-letters.txt` contenha as mesmas palavras de `palavras_5_letras.txt` (já sincronizado) ou ajustar `WordsDictionaryService` para aceitar ambos os caminhos.
6. **Testes**
   - Cobrir cenários: run nova, acerto, erro com 4 tentativas, finalização após exaurir palavras, abandono manual.
7. **Documentação**
   - Atualizar `README.md` com nova seção “Modo infinito (runs)” incluindo rotas e explicações resumidas.

## Observações
- O arquivo `palavras_5_letras.txt` define a pool oficial de palavras tanto para runs quanto para validação de palpites. O serviço deve carregar esse arquivo uma única vez e mantê-lo em memória para evitar re-leitura a cada request.
- Como a run consome palavras sequencialmente, o documento armazena `remainingWords` embaralhadas. Em ambientes com muitos usuários, considere gerar as palavras sob demanda usando `$sample` no MongoDB (WordsBankEntry) para reduzir o payload salvo por run.
- As métricas de ranking globais (`WordsUsersService.listRanking`) continuam baseadas em `score` diário. Caso seja necessário criar um ranking específico do modo infinito, adicione um endpoint dedicado (`/words/ranking/infinite`) que use `infiniteRecord`.
