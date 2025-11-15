import type { IWordsUser } from "../models/words-user";
import {
  WordsUserPuzzleModel,
  type IWordsUserPuzzle,
} from "../models/words-user-puzzle";
import { WordsPuzzlesService } from "./words-puzzles.service";
import { WordsUsersService } from "./words-users.service";
import { WordsDictionaryService } from "./words-dictionary.service";

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

    let userPuzzle = await WordsUserPuzzleModel.findOne({
      userId: user._id,
      date: puzzle.date,
    });

    if (!userPuzzle) {
      userPuzzle = await WordsUserPuzzleModel.create({
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
    }

    if (userPuzzle.status === "won" || userPuzzle.status === "lost") {
      throw new WordsDailyGameError(
        `Daily puzzle already ${userPuzzle.status}`,
        409,
        {
          status: userPuzzle.status,
          finishedAt: userPuzzle.finishedAt
            ? userPuzzle.finishedAt.toISOString()
            : null,
        },
      );
    }

    if (userPuzzle.attemptsUsed >= userPuzzle.maxAttempts) {
      throw new WordsDailyGameError("Maximum attempts reached", 409, {
        maxAttempts: userPuzzle.maxAttempts,
      });
    }

    const attemptNumber = userPuzzle.attemptsUsed + 1;
    const evaluation = this.evaluateGuess(normalizedGuess, puzzle.puzzleWord);

    userPuzzle.guesses.push({
      attemptNumber,
      guessWord: normalizedGuess,
      pattern: evaluation.pattern,
      createdAt: new Date(),
    });
    userPuzzle.attemptsUsed = attemptNumber;

    const newStatus = evaluation.isCorrect
      ? "won"
      : attemptNumber >= userPuzzle.maxAttempts
        ? "lost"
        : "in_progress";

    userPuzzle.status = newStatus;
    userPuzzle.finishedAt = newStatus === "in_progress" ? null : new Date();
    userPuzzle.score =
      newStatus === "won" ? this.computeScore(attemptNumber) : 0;

    await userPuzzle.save();

    let updatedUser: IWordsUser | null = null;
    let scoreAwarded = 0;
    let shouldIncrementStreak = false;
    let scoreIncrement = 0;

    if (newStatus === "won") {
      scoreAwarded = userPuzzle.score;
      shouldIncrementStreak = true;
      scoreIncrement = scoreAwarded;
    } else if (newStatus === "lost") {
      shouldIncrementStreak = true;
    }

    if (shouldIncrementStreak) {
      updatedUser =
        (await this.usersService.incrementStreak(user.id, {
          streakIncrement: 1,
          scoreIncrement,
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
      attemptsUsed: userPuzzle.attemptsUsed,
      remainingAttempts: Math.max(
        0,
        userPuzzle.maxAttempts - userPuzzle.attemptsUsed,
      ),
      finishedAt: userPuzzle.finishedAt ?? null,
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
