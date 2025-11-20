import type { IWordsUser } from "../models/words-user";
import {
  WordsInfiniteRunModel,
  type IWordsInfiniteRun,
} from "../models/words-infinite-run";
import { WordsInfiniteRunService, WordsInfiniteRunError } from "./words-infinite-run.service";
import { wordsInfiniteRoomService } from "./words-infinite-room.service";
import type { WordsInfiniteRoom } from "../models/words-infinite-room";
import { evaluateWordGuess } from "../utils/words-guess-evaluator";

export class WordsInfiniteCoopService {
  constructor(
    private readonly infiniteRunService = new WordsInfiniteRunService()
  ) {}

  /**
   * Iniciar run co-op para uma sala
   * Apenas quando a sala tiver 2 jogadores
   */
  async startCoopRun(room: WordsInfiniteRoom): Promise<{
    run: IWordsInfiniteRun;
    currentTurnPlayer: string;
  }> {
    if (room.players.length !== 2) {
      throw new WordsInfiniteRunError("Sala precisa ter 2 jogadores", 400);
    }

    if (room.status !== "playing") {
      throw new WordsInfiniteRunError("Sala não está em jogo", 400);
    }

    // Usar player 1 como "dono" do run (mas ambos jogam)
    const player1 = room.players[0];

    // Buscar user do player1
    const user = await this.infiniteRunService["usersService"].findById(player1.userId);
    if (!user) {
      throw new WordsInfiniteRunError("Usuário não encontrado", 404);
    }

    // Criar run base - obter wordpool e selecionar palavra
    const wordPool = await this.infiniteRunService["ensureWordPool"]();
    const firstWord = await this.infiniteRunService["pickNextWord"](new Set());

    if (!firstWord) {
      throw new WordsInfiniteRunError("Não foi possível selecionar palavra", 500);
    }

    const run = await WordsInfiniteRunModel.create({
      userId: user._id,
      status: "active",
      currentScore: 0,
      maxAttempts: 5,
      attemptsUsed: 0,
      nextWord: firstWord,
      usedWords: [firstWord],
      currentGuesses: [],
      history: [],
      // Campos multiplayer
      roomId: room.roomId,
      isMultiplayer: true,
      currentTurnPlayerId: player1.userId, // Player 1 começa
    });

    // Atualizar roomId na sala
    await wordsInfiniteRoomService.updateCurrentRun(room.roomId, String(run._id));

    // Determinar de quem é o turno (attempt 1)
    const currentTurnPlayer = wordsInfiniteRoomService.getCurrentTurnPlayer(room, 1);

    return { run, currentTurnPlayer };
  }

  /**
   * Buscar run co-op ativo de uma sala
   */
  async getCoopRun(roomId: string): Promise<IWordsInfiniteRun | null> {
    return WordsInfiniteRunModel.findOne({
      roomId,
      status: "active",
    });
  }

  /**
   * Submit guess no modo co-op
   * Valida se é o turno do jogador correto
   */
  async submitCoopGuess(
    room: WordsInfiniteRoom,
    userId: string,
    guessWord: string
  ): Promise<{
    run: IWordsInfiniteRun;
    result: any;
    isGameOver: boolean;
    nextTurnPlayer?: string;
  }> {
    // Buscar run da sala
    const run = await this.getCoopRun(room.roomId);
    if (!run) {
      throw new WordsInfiniteRunError("Run não encontrado", 404);
    }

    // Validar turno do jogador
    const nextAttemptNumber = run.attemptsUsed + 1;
    const isCorrectTurn = wordsInfiniteRoomService.isPlayerTurn(
      room,
      nextAttemptNumber,
      userId
    );

    if (!isCorrectTurn) {
      const expectedPlayer = wordsInfiniteRoomService.getCurrentTurnPlayer(
        room,
        nextAttemptNumber
      );
      const expectedPlayerName = room.players.find(p => p.userId === expectedPlayer)?.username;
      throw new WordsInfiniteRunError(
        `Não é seu turno! Aguarde ${expectedPlayerName} jogar.`,
        403
      );
    }

    // Normalizar palavra
    const normalizedGuess = this.infiniteRunService["normalizeWord"](guessWord);
    if (!normalizedGuess) {
      throw new WordsInfiniteRunError("Palavra inválida", 400);
    }

    if (!run.nextWord) {
      throw new WordsInfiniteRunError("Run não está pronto para palpites", 409);
    }

    // Verificar se já tentou essa palavra
    if (run.currentGuesses.some((g) => g.guessWord === normalizedGuess)) {
      throw new WordsInfiniteRunError("Você já tentou essa palavra", 409);
    }

    // Validar palavra no dicionário
    const isValidWord = await this.infiniteRunService["dictionaryService"].isAllowed(
      normalizedGuess
    );
    if (!isValidWord) {
      throw new WordsInfiniteRunError("Palavra não encontrada no dicionário", 400);
    }

    // Avaliar palpite usando a função utilitária
    const evaluation = evaluateWordGuess(normalizedGuess, run.nextWord);
    const pattern = evaluation.pattern;
    const isCorrect = evaluation.isCorrect;

    // Incrementar tentativas
    run.attemptsUsed += 1;

    // Adicionar guess (com playerId para histórico)
    const guess = {
      attemptNumber: run.attemptsUsed,
      guessWord: normalizedGuess,
      pattern,
      playerId: userId,
      createdAt: new Date(),
    };
    run.currentGuesses.push(guess);

    let isGameOver = false;
    let nextTurnPlayer: string | undefined;
    let result: any;

    if (isCorrect) {
      // Vitória
      result = await this.handleCoopVictory(run, room);
      isGameOver = false; // Continua para próxima palavra

      // Incrementar contador de jogos
      await wordsInfiniteRoomService.incrementGamesPlayed(room.roomId);

      // Próximo jogo: determinar quem começa (attempt 1 da nova palavra)
      const updatedRoom = await wordsInfiniteRoomService.getRoom(room.roomId);
      if (updatedRoom) {
        nextTurnPlayer = wordsInfiniteRoomService.getCurrentTurnPlayer(updatedRoom, 1);
        run.currentTurnPlayerId = nextTurnPlayer;
      }
    } else if (run.attemptsUsed >= run.maxAttempts) {
      // Derrota (esgotou tentativas)
      result = await this.handleCoopFailure(run, room);
      isGameOver = true;
    } else {
      // Continua jogando - próximo turno
      nextTurnPlayer = wordsInfiniteRoomService.getNextPlayer(room, run.attemptsUsed);
      run.currentTurnPlayerId = nextTurnPlayer;
      result = { guess, isCorrect: false, isGameOver: false };

      console.log("🔄 [COOP] Calculando próximo turno:", {
        attemptsUsed: run.attemptsUsed,
        nextTurnPlayer,
        currentPlayerId: userId,
        roomPlayers: room.players.map(p => ({ userId: p.userId, username: p.username })),
      });
    }

    await run.save();

    return {
      run,
      result,
      isGameOver,
      nextTurnPlayer,
    };
  }

  /**
   * Lidar com vitória no co-op
   */
  private async handleCoopVictory(
    run: IWordsInfiniteRun,
    room: WordsInfiniteRoom
  ) {
    const wordPool = await this.infiniteRunService["ensureWordPool"]();
    const usedWordsSet = new Set(run.usedWords);
    const nextWord = await this.infiniteRunService["pickNextWord"](usedWordsSet);

    if (!nextWord) {
      throw new WordsInfiniteRunError("Não foi possível selecionar próxima palavra", 500);
    }

    // Adicionar à história
    const historyEntry = {
      order: run.history.length + 1,
      word: run.nextWord!,
      result: "won" as const,
      attemptsUsed: run.attemptsUsed,
      guesses: [...run.currentGuesses],
      finishedAt: new Date(),
    };
    run.history.push(historyEntry);

    // Incrementar score
    run.currentScore += 1;

    // Preparar próxima palavra
    run.nextWord = nextWord;
    run.usedWords.push(nextWord);
    run.currentGuesses = [];
    run.attemptsUsed = 0;

    return {
      isCorrect: true,
      isGameOver: false,
      nextWord,
      currentScore: run.currentScore,
    };
  }

  /**
   * Lidar com derrota no co-op
   */
  private async handleCoopFailure(
    run: IWordsInfiniteRun,
    room: WordsInfiniteRoom
  ) {
    // Adicionar à história
    const historyEntry = {
      order: run.history.length + 1,
      word: run.nextWord!,
      result: "lost" as const,
      attemptsUsed: run.attemptsUsed,
      guesses: [...run.currentGuesses],
      finishedAt: new Date(),
    };
    run.history.push(historyEntry);

    // Finalizar run
    run.status = "failed";
    run.nextWord = null;

    // Finalizar sala
    await wordsInfiniteRoomService.finishRoom(room.roomId);

    // Atualizar ambos os usuários
    for (const player of room.players) {
      await this.infiniteRunService["usersService"].updateInfiniteProgress(
        player.userId,
        {
          status: "failed",
          currentScore: run.currentScore,
        }
      );
    }

    return {
      isCorrect: false,
      isGameOver: true,
      finalScore: run.currentScore,
      correctWord: run.nextWord,
    };
  }

  /**
   * Abandonar run co-op
   */
  async abandonCoopRun(room: WordsInfiniteRoom, userId: string) {
    const run = await this.getCoopRun(room.roomId);
    if (!run) {
      throw new WordsInfiniteRunError("Run não encontrado", 404);
    }

    // Marcar como failed
    run.status = "failed";
    await run.save();

    // Finalizar sala
    await wordsInfiniteRoomService.finishRoom(room.roomId);

    // Atualizar usuários
    for (const player of room.players) {
      await this.infiniteRunService["usersService"].updateInfiniteProgress(
        player.userId,
        {
          status: "failed",
          currentScore: run.currentScore,
        }
      );
    }

    return {
      abandoned: true,
      finalScore: run.currentScore,
    };
  }
}

export const wordsInfiniteCoopService = new WordsInfiniteCoopService();
