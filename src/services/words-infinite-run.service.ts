import path from "path";
import type { IWordsUser } from "../models/words-user";
import {
  WordsInfiniteRunModel,
  type IWordsInfiniteRun,
  type InfiniteRunHistoryEntry,
  type InfiniteRunGuess,
} from "../models/words-infinite-run";
import { WordsUsersService } from "./words-users.service";
import { WordsDictionaryService } from "./words-dictionary.service";
import { evaluateWordGuess } from "../utils/words-guess-evaluator";

const MAX_ATTEMPTS = 4;
const DEFAULT_INFINITE_DICTIONARY_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "dados",
  "palavras_5_letras.txt",
);

export class WordsInfiniteRunError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400,
  ) {
    super(message);
  }
}

export class WordsInfiniteRunService {
  constructor(
    private readonly usersService = new WordsUsersService(),
    private readonly dictionaryService = new WordsDictionaryService(
      process.env.WORDS_INFINITE_DICTIONARY_PATH ??
        DEFAULT_INFINITE_DICTIONARY_PATH,
    ),
  ) {}

  private wordPool: string[] | null = null;

  async startRun(user: IWordsUser) {
    let run = await this.findActiveRun(user);
    if (!run) {
      run = await this.createRun(user);
    }

    const updatedUser =
      (await this.usersService.updateInfiniteProgress(user.id, {
        status: "active",
        currentScore: run.currentScore,
      })) ?? user;

    return this.wrapResult(run, updatedUser);
  }

  async getRun(user: IWordsUser) {
    const run = await this.findActiveRun(user);
    if (!run) {
      throw new WordsInfiniteRunError("No active infinite run", 404);
    }

    return this.wrapResult(run, user);
  }

  async submitGuess(user: IWordsUser, guessWord: string) {
    const run = await this.findActiveRun(user);
    if (!run) {
      throw new WordsInfiniteRunError("No active infinite run", 404);
    }

    const normalizedGuess = this.normalizeWord(guessWord);
    if (!normalizedGuess) {
      throw new WordsInfiniteRunError("Guess word is required", 400);
    }

    if (!run.nextWord) {
      throw new WordsInfiniteRunError("Run is not ready for guesses", 409);
    }

    if (normalizedGuess.length !== run.nextWord.length) {
      throw new WordsInfiniteRunError(
        `Guess must contain ${run.nextWord.length} letters`,
        400,
      );
    }

    const allowed = await this.dictionaryService.isAllowed(normalizedGuess);
    if (!allowed) {
      throw new WordsInfiniteRunError("Guess word is not allowed", 400);
    }

    const evaluation = evaluateWordGuess(normalizedGuess, run.nextWord);
    const attemptNumber = run.attemptsUsed + 1;
    run.attemptsUsed = attemptNumber;

    run.currentGuesses.push({
      attemptNumber,
      guessWord: normalizedGuess,
      pattern: evaluation.pattern,
      createdAt: new Date(),
    });

    let updatedUser: IWordsUser | null = null;

    if (evaluation.isCorrect) {
      updatedUser = await this.handleVictory(user, run);
    } else if (run.attemptsUsed >= run.maxAttempts) {
      updatedUser = await this.handleFailure(user, run);
    }

    await run.save();
    return this.wrapResult(run, updatedUser ?? user);
  }

  async abandonRun(user: IWordsUser) {
    const run = await this.findActiveRun(user);
    if (!run) {
      throw new WordsInfiniteRunError("No active infinite run", 404);
    }

    if (run.nextWord) {
      this.pushHistoryEntry(run, {
        order: run.history.length + 1,
        word: run.nextWord,
        result: "lost",
        attemptsUsed: run.attemptsUsed,
        guesses: run.currentGuesses,
        finishedAt: new Date(),
      });
      run.usedWords.push(run.nextWord);
    }

    run.status = "failed";
    run.nextWord = null;
    run.currentGuesses = [];
    run.attemptsUsed = 0;

    const record = Math.max(user.infiniteRecord ?? 0, run.currentScore ?? 0);
    const updatedUser =
      (await this.usersService.updateInfiniteProgress(user.id, {
        status: "failed",
        currentScore: 0,
        record,
      })) ?? user;

    await run.save();
    return this.wrapResult(run, updatedUser);
  }

  private async createRun(user: IWordsUser) {
    const nextWord = await this.pickNextWord(new Set());
    if (!nextWord) {
      throw new WordsInfiniteRunError(
        "No words available to start the infinite mode",
        500,
      );
    }

    return WordsInfiniteRunModel.create({
      userId: user._id,
      status: "active",
      currentScore: 0,
      maxAttempts: MAX_ATTEMPTS,
      attemptsUsed: 0,
      nextWord,
      usedWords: [],
      currentGuesses: [],
      history: [],
    });
  }

  private async handleVictory(user: IWordsUser, run: IWordsInfiniteRun) {
    if (!run.nextWord) {
      throw new WordsInfiniteRunError("Run has no target word", 409);
    }

    this.pushHistoryEntry(run, {
      order: run.history.length + 1,
      word: run.nextWord,
      result: "won",
      attemptsUsed: run.attemptsUsed,
      guesses: run.currentGuesses,
      finishedAt: new Date(),
    });
    run.usedWords.push(run.nextWord);
    run.currentScore += 1;
    run.currentGuesses = [];
    run.attemptsUsed = 0;

    const record = Math.max(user.infiniteRecord ?? 0, run.currentScore);
    const nextWord = await this.pickNextWord(new Set(run.usedWords));

    if (nextWord) {
      run.nextWord = nextWord;
      run.status = "active";
      return (
        (await this.usersService.updateInfiniteProgress(user.id, {
          status: "active",
          currentScore: run.currentScore,
          record,
        })) ?? user
      );
    }

    run.nextWord = null;
    run.status = "completed";

    return (
      (await this.usersService.updateInfiniteProgress(user.id, {
        status: "completed",
        currentScore: 0,
        record,
      })) ?? user
    );
  }

  private async handleFailure(user: IWordsUser, run: IWordsInfiniteRun) {
    if (!run.nextWord) {
      throw new WordsInfiniteRunError("Run has no target word", 409);
    }

    this.pushHistoryEntry(run, {
      order: run.history.length + 1,
      word: run.nextWord,
      result: "lost",
      attemptsUsed: run.attemptsUsed,
      guesses: run.currentGuesses,
      finishedAt: new Date(),
    });
    run.usedWords.push(run.nextWord);
    run.currentGuesses = [];
    run.status = "failed";
    run.nextWord = null;
    run.attemptsUsed = 0;

    const record = Math.max(user.infiniteRecord ?? 0, run.currentScore ?? 0);

    return (
      (await this.usersService.updateInfiniteProgress(user.id, {
        status: "failed",
        currentScore: 0,
        record,
      })) ?? user
    );
  }

  private pushHistoryEntry(
    run: IWordsInfiniteRun,
    entry: InfiniteRunHistoryEntry,
  ) {
    const guesses: InfiniteRunGuess[] = entry.guesses.map((guess) => ({
      attemptNumber: guess.attemptNumber,
      guessWord: guess.guessWord,
      pattern: guess.pattern,
      createdAt: guess.createdAt,
    }));

    run.history.push({
      order: entry.order,
      word: entry.word,
      result: entry.result,
      attemptsUsed: entry.attemptsUsed,
      guesses,
      finishedAt: entry.finishedAt,
    });
  }

  private async pickNextWord(excluded: Set<string>) {
    const pool = await this.ensureWordPool();
    const available = pool.filter((word) => !excluded.has(word));

    if (!available.length) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * available.length);
    return available[randomIndex];
  }

  private async ensureWordPool() {
    if (this.wordPool) {
      return this.wordPool;
    }

    const words = await this.dictionaryService.getAllWords();
    if (!words.length) {
      throw new WordsInfiniteRunError(
        "Dictionary for infinite mode is empty",
        500,
      );
    }

    this.wordPool = words;
    return this.wordPool;
  }

  private async wrapResult(run: IWordsInfiniteRun, user: IWordsUser) {
    const totalWords = (await this.ensureWordPool()).length;
    return { run, user, totalWords };
  }

  private findActiveRun(user: IWordsUser) {
    return WordsInfiniteRunModel.findOne({
      userId: user._id,
      status: "active",
    });
  }

  private normalizeWord(value: string) {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toUpperCase();
  }
}
