import type { IWordsUser } from "../models/words-user";
import type { IWordsPuzzle } from "../models/words-puzzle";
import {
  WordsUserPuzzleModel,
  type IWordsUserPuzzle,
} from "../models/words-user-puzzle";
import { WordsPuzzlesService } from "./words-puzzles.service";
import { WordsUsersService } from "./words-users.service";
import { WordsDictionaryService } from "./words-dictionary.service";
import { isTestWordsUser } from "../utils/words-test-user";

export type LetterState = "correct" | "present" | "absent";

export interface LetterEvaluation {
  letter: string;
  state: LetterState;
}

export interface GuessEvaluation {
  letters: LetterEvaluation[];
  pattern: string;
  isCorrect: boolean;
}

export interface GuessHistoryEntry {
  attemptNumber: number;
  guessWord: string;
  letters: LetterEvaluation[];
  pattern: string;
  createdAt: Date;
}

export interface DailyStatusResult {
  puzzle: {
    id: string;
    date: string;
    dailyId: string;
    maxAttempts: number;
  };
  status: IWordsUserPuzzle["status"];
  attemptsUsed: number;
  remainingAttempts: number;
  finishedAt: Date | null;
  scoreAwarded: number;
  guesses: GuessHistoryEntry[];
}

interface SubmitDailyGuessParams {
  user: IWordsUser;
  guessWord: string;
  targetDate?: string;
}

interface DailyStatusParams {
  user: IWordsUser;
  targetDate?: string;
}

export interface SubmitDailyGuessResult {
  puzzle: {
    id: string;
    date: string;
    dailyId: string;
    maxAttempts: number;
  };
  attemptNumber: number;
  evaluation: GuessEvaluation;
  status: IWordsUserPuzzle["status"];
  attemptsUsed: number;
  remainingAttempts: number;
  finishedAt: Date | null;
  scoreAwarded: number;
  userScore: number;
  user: IWordsUser;
}

interface TestUserPuzzleSession {
  userId: string;
  puzzleId: string;
  puzzleWord: string;
  date: string;
  status: IWordsUserPuzzle["status"];
  attemptsUsed: number;
  maxAttempts: number;
  score: number;
  guesses: {
    attemptNumber: number;
    guessWord: string;
    pattern: string;
    createdAt: Date;
  }[];
  finishedAt: Date | null;
}

export class WordsDailyGameError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export class WordsDailyGameService {
  constructor(
    private readonly puzzlesService = new WordsPuzzlesService(),
    private readonly usersService = new WordsUsersService(),
    private readonly dictionaryService = new WordsDictionaryService(),
  ) {}

  private readonly testSessions = new Map<string, TestUserPuzzleSession>();

  async submitGuess({
    user,
    guessWord,
    targetDate,
  }: SubmitDailyGuessParams): Promise<SubmitDailyGuessResult> {
    const puzzle = await this.resolvePuzzle(targetDate);
    if (!puzzle) {
      throw new WordsDailyGameError("Daily puzzle not found for date", 404);
    }

    const normalizedGuess = this.normalizeWord(guessWord);
    if (normalizedGuess.length !== puzzle.puzzleWord.length) {
      throw new WordsDailyGameError(
        `Guess must contain ${puzzle.puzzleWord.length} letters`,
        400,
      );
    }

    const isValidWord = await this.dictionaryService.isAllowed(normalizedGuess);
    if (!isValidWord) {
      throw new WordsDailyGameError("Guess word is not allowed", 400, {
        guess: normalizedGuess,
      });
    }

    const isTestUser = isTestWordsUser(user);
    const puzzleState = isTestUser
      ? this.getOrCreateTestSession(user, puzzle)
      : await this.getOrCreateUserPuzzle(user, puzzle);

    const attemptsUsed =
      puzzleState.kind === "test"
        ? puzzleState.session.attemptsUsed
        : puzzleState.doc.attemptsUsed;
    const maxAttempts =
      puzzleState.kind === "test"
        ? puzzleState.session.maxAttempts
        : puzzleState.doc.maxAttempts;

    if (attemptsUsed >= maxAttempts) {
      throw new WordsDailyGameError("Maximum attempts reached", 409, {
        maxAttempts,
      });
    }

    const attemptNumber = attemptsUsed + 1;
    const evaluation = this.evaluateGuess(normalizedGuess, puzzle.puzzleWord);

    const guessEntry = {
      attemptNumber,
      guessWord: normalizedGuess,
      pattern: evaluation.pattern,
      createdAt: new Date(),
    };

    let newStatus: IWordsUserPuzzle["status"];
    if (puzzleState.kind === "test") {
      puzzleState.session.guesses.push(guessEntry);
      puzzleState.session.attemptsUsed = attemptNumber;
      newStatus = evaluation.isCorrect
        ? "won"
        : attemptNumber >= puzzleState.session.maxAttempts
          ? "lost"
          : "in_progress";
      puzzleState.session.status = newStatus;
      puzzleState.session.finishedAt =
        newStatus === "in_progress" ? null : new Date();
      puzzleState.session.score =
        newStatus === "won" ? this.computeScore(attemptNumber) : 0;
    } else {
      puzzleState.doc.guesses.push(guessEntry);
      puzzleState.doc.attemptsUsed = attemptNumber;
      newStatus = evaluation.isCorrect
        ? "won"
        : attemptNumber >= puzzleState.doc.maxAttempts
          ? "lost"
          : "in_progress";

      puzzleState.doc.status = newStatus;
      puzzleState.doc.finishedAt =
        newStatus === "in_progress" ? null : new Date();
      puzzleState.doc.score =
        newStatus === "won" ? this.computeScore(attemptNumber) : 0;

      await puzzleState.doc.save();
    }

    let updatedUser: IWordsUser | null = null;
    let scoreAwarded = 0;
    if (newStatus === "won") {
      scoreAwarded =
        puzzleState.kind === "test"
          ? puzzleState.session.score
          : puzzleState.doc.score;

      if (!isTestUser) {
        updatedUser =
          (await this.usersService.incrementStreak(user.id, {
            streakIncrement: 1,
            scoreIncrement: scoreAwarded,
          })) ?? user;
      }
    } else if (!isTestUser && newStatus === "lost") {
      updatedUser =
        (await this.usersService.incrementStreak(user.id, {
          streakIncrement: 1,
          scoreIncrement: 0,
        })) ?? user;
    }

    return {
      puzzle: {
        id: puzzle.id,
        date: puzzle.date,
        dailyId: this.getDailyId(puzzle.date),
        maxAttempts: puzzle.maxAttempts,
      },
      attemptNumber,
      evaluation,
      status: newStatus,
      attemptsUsed:
        puzzleState.kind === "test"
          ? puzzleState.session.attemptsUsed
          : puzzleState.doc.attemptsUsed,
      remainingAttempts:
        puzzleState.kind === "test"
          ? Math.max(
              0,
              puzzleState.session.maxAttempts -
                puzzleState.session.attemptsUsed,
            )
          : Math.max(
              0,
              puzzleState.doc.maxAttempts - puzzleState.doc.attemptsUsed,
            ),
      finishedAt:
        puzzleState.kind === "test"
          ? (puzzleState.session.finishedAt ?? null)
          : (puzzleState.doc.finishedAt ?? null),
      scoreAwarded,
      userScore: updatedUser?.score ?? user.score ?? 0,
      user: updatedUser ?? user,
    };
  }

  private evaluateGuess(guess: string, target: string): GuessEvaluation {
    const guessChars = guess.split("");
    const targetChars = target.split("");
    const letters: LetterEvaluation[] = guessChars.map((letter) => ({
      letter,
      state: "absent",
    }));
    const usedTarget = new Array(targetChars.length).fill(false);

    for (let index = 0; index < guessChars.length; index++) {
      if (guessChars[index] === targetChars[index]) {
        letters[index].state = "correct";
        usedTarget[index] = true;
      }
    }

    for (let index = 0; index < guessChars.length; index++) {
      if (letters[index].state !== "absent") continue;
      const letter = guessChars[index];
      const targetIndex = targetChars.findIndex(
        (targetLetter, targetLetterIndex) =>
          !usedTarget[targetLetterIndex] && targetLetter === letter,
      );
      if (targetIndex !== -1) {
        letters[index].state = "present";
        usedTarget[targetIndex] = true;
      }
    }

    const pattern = letters
      .map((entry) => {
        switch (entry.state) {
          case "correct":
            return "2";
          case "present":
            return "1";
          default:
            return "0";
        }
      })
      .join("");

    return {
      letters,
      pattern,
      isCorrect: letters.every((entry) => entry.state === "correct"),
    };
  }

  async getDailyStatus({
    user,
    targetDate,
  }: DailyStatusParams): Promise<DailyStatusResult> {
    const puzzle = await this.resolvePuzzle(targetDate);
    if (!puzzle) {
      throw new WordsDailyGameError("Daily puzzle not found for date", 404);
    }

    const isTestUser = isTestWordsUser(user);
    if (isTestUser) {
      return {
        puzzle: {
          id: puzzle.id,
          date: puzzle.date,
          dailyId: this.getDailyId(puzzle.date),
          maxAttempts: puzzle.maxAttempts,
        },
        status: "in_progress",
        attemptsUsed: 0,
        remainingAttempts: puzzle.maxAttempts,
        finishedAt: null,
        scoreAwarded: 0,
        guesses: [],
      };
    }

    const userPuzzle = await WordsUserPuzzleModel.findOne({
      userId: user._id,
      date: puzzle.date,
    });

    const attemptsUsed = userPuzzle?.attemptsUsed ?? 0;
    const status = userPuzzle?.status ?? "in_progress";
    const scoreAwarded = userPuzzle?.score ?? 0;
    const guesses: GuessHistoryEntry[] = userPuzzle
      ? userPuzzle.guesses.map((guess) => ({
          attemptNumber: guess.attemptNumber,
          guessWord: guess.guessWord,
          pattern: guess.pattern,
          letters: this.patternToLetters(guess.guessWord, guess.pattern),
          createdAt: guess.createdAt,
        }))
      : [];

    return {
      puzzle: {
        id: puzzle.id,
        date: puzzle.date,
        dailyId: this.getDailyId(puzzle.date),
        maxAttempts: puzzle.maxAttempts,
      },
      status,
      attemptsUsed,
      remainingAttempts: Math.max(0, puzzle.maxAttempts - attemptsUsed),
      finishedAt: userPuzzle?.finishedAt ?? null,
      scoreAwarded,
      guesses,
    };
  }

  private getOrCreateTestSession(user: IWordsUser, puzzle: IWordsPuzzle) {
    const key = this.getTestSessionKey(user, puzzle.date);
    const existing = this.testSessions.get(key);
    if (existing && existing.status !== "in_progress") {
      this.testSessions.delete(key);
    }

    let session = this.testSessions.get(key);
    if (!session) {
      session = {
        userId: user.id,
        puzzleId: puzzle.id,
        puzzleWord: puzzle.puzzleWord,
        date: puzzle.date,
        status: "in_progress",
        attemptsUsed: 0,
        maxAttempts: puzzle.maxAttempts,
        score: 0,
        guesses: [],
        finishedAt: null,
      };
      this.testSessions.set(key, session);
    }

    return { kind: "test" as const, session };
  }

  private getExistingTestSession(user: IWordsUser, date: string) {
    return this.testSessions.get(this.getTestSessionKey(user, date)) ?? null;
  }

  private getTestSessionKey(user: IWordsUser, date: string) {
    return `${user.id}:${date}`;
  }

  private async getOrCreateUserPuzzle(user: IWordsUser, puzzle: IWordsPuzzle) {
    let doc = await WordsUserPuzzleModel.findOne({
      userId: user._id,
      date: puzzle.date,
    });

    if (!doc) {
      doc = await WordsUserPuzzleModel.create({
        userId: user._id,
        puzzleId: puzzle._id,
        puzzleWord: puzzle.puzzleWord,
        date: puzzle.date,
        status: "in_progress",
        attemptsUsed: 0,
        maxAttempts: puzzle.maxAttempts,
        score: 0,
        guesses: [],
        finishedAt: null,
      });
    } else if (doc.status === "won" || doc.status === "lost") {
      throw new WordsDailyGameError(`Daily puzzle already ${doc.status}`, 409, {
        status: doc.status,
        finishedAt: doc.finishedAt ? doc.finishedAt.toISOString() : null,
      });
    }

    return { kind: "db" as const, doc };
  }

  private normalizeWord(value: string) {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toUpperCase();
  }

  private computeScore(attemptNumber: number) {
    const attemptScores = [10, 8, 6, 4, 3, 2];
    return attemptScores[attemptNumber - 1] ?? 0;
  }

  private patternToLetters(
    guessWord: string,
    pattern: string,
  ): LetterEvaluation[] {
    return guessWord.split("").map((letter, index) => ({
      letter,
      state: this.patternDigitToState(pattern.charAt(index)),
    }));
  }

  private patternDigitToState(digit: string): LetterState {
    switch (digit) {
      case "2":
        return "correct";
      case "1":
        return "present";
      default:
        return "absent";
    }
  }

  private getDailyId(date: string) {
    return date.replace(/-/g, "");
  }

  private resolvePuzzle(targetDate?: string) {
    if (targetDate) {
      return this.puzzlesService.findByDate(targetDate);
    }
    return this.puzzlesService.findByDate(new Date());
  }
}
