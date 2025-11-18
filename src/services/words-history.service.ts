import { Types } from "mongoose";
import type { IWordsPuzzle } from "../models/words-puzzle";
import {
  type CreateWordsHistoryEntryDto,
  WordsUserPuzzleModel,
  type IWordsUserPuzzle,
} from "../models/words-user-puzzle";
import type { IWordsUser } from "../models/words-user";
import { WordsUsersService } from "./words-users.service";

interface PaginateHistoryParams {
  page?: number;
  pageSize?: number;
}

export class WordsHistoryError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
  }
}

export class WordsHistoryService {
  constructor(private readonly usersService = new WordsUsersService()) {}

  async createEntry(
    user: IWordsUser,
    puzzle: IWordsPuzzle,
    dto: CreateWordsHistoryEntryDto,
  ) {
    if (this.isPastPuzzle(puzzle.date)) {
      throw new WordsHistoryError(
        "Past puzzles cannot be updated through this endpoint",
        400,
      );
    }

    const existingEntry = await WordsUserPuzzleModel.findOne({
      userId: user._id,
      puzzleId: puzzle._id,
    });
    if (existingEntry) {
      throw new WordsHistoryError(
        "History already registered for this puzzle",
        409,
      );
    }

    const maxAttempts = dto.maxAttempts ?? puzzle.maxAttempts;
    if (maxAttempts !== puzzle.maxAttempts) {
      throw new WordsHistoryError(
        "maxAttempts does not match the puzzle configuration",
        400,
      );
    }

    if (dto.attemptsUsed < 0 || dto.attemptsUsed > maxAttempts) {
      throw new WordsHistoryError("Invalid attemptsUsed value", 400);
    }

    const normalizedPuzzleWord = puzzle.puzzleWord.toUpperCase();
    const guesses = (dto.guesses ?? []).map((guess) => ({
      attemptNumber: guess.attemptNumber,
      guessWord: guess.guessWord.toUpperCase(),
      pattern: guess.pattern,
      createdAt: guess.createdAt ? new Date(guess.createdAt) : new Date(),
    }));

    if (guesses.length !== dto.attemptsUsed) {
      throw new WordsHistoryError(
        "attemptsUsed must match the amount of guesses provided",
        400,
      );
    }

    guesses.forEach((guess, index) => {
      if (guess.attemptNumber !== index + 1) {
        throw new WordsHistoryError("Invalid guess attempt numbering", 400);
      }
      if (guess.guessWord.length !== normalizedPuzzleWord.length) {
        throw new WordsHistoryError(
          "Guess length does not match puzzle word",
          400,
        );
      }
    });

    if (dto.status === "won") {
      if (guesses.length === 0) {
        throw new WordsHistoryError(
          "Winning entries must include at least one guess",
          400,
        );
      }
      const lastGuess = guesses[guesses.length - 1];
      if (lastGuess.guessWord !== normalizedPuzzleWord) {
        throw new WordsHistoryError(
          "Winning entries must end with the puzzle word",
          400,
        );
      }
    }

    const finishedAt = dto.finishedAt ? new Date(dto.finishedAt) : null;
    const firstGuessAt = dto.firstGuessAt
      ? new Date(dto.firstGuessAt)
      : this.resolveFirstGuessTimestamp(guesses);
    const timeSpentMs =
      typeof dto.timeSpentMs === "number"
        ? dto.timeSpentMs
        : this.calculateTimeSpentMs(firstGuessAt, finishedAt);

    const scoreEarned =
      dto.status === "won" ? this.computeScore(dto.attemptsUsed) : 0;

    const entry = await WordsUserPuzzleModel.create({
      userId: user._id,
      puzzleId: puzzle._id,
      puzzleWord: puzzle.puzzleWord,
      date: puzzle.date,
      status: dto.status,
      attemptsUsed: dto.attemptsUsed,
      maxAttempts,
      score: scoreEarned,
      guesses,
      finishedAt,
      firstGuessAt,
      timeSpentMs: timeSpentMs ?? null,
    });

    const timeSpentIncrement =
      dto.status === "won" && timeSpentMs !== null ? timeSpentMs : 0;

    const updatedUser =
      (await this.usersService.incrementStreak(user.id, {
        streakIncrement: 1,
        scoreIncrement: scoreEarned,
        timeSpentIncrement,
      })) ?? user;

    return {
      user: updatedUser,
      historyItem: this.mapToHistoryItem(entry),
    };
  }

  async paginateHistory(
    userId: string,
    { page = 1, pageSize = 10 }: PaginateHistoryParams = {},
  ) {
    const skip = (page - 1) * pageSize;
    const [items, totalItems] = await Promise.all([
      WordsUserPuzzleModel.find({ userId })
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(pageSize),
      WordsUserPuzzleModel.countDocuments({ userId }),
    ]);

    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize);

    return {
      page,
      pageSize,
      totalPages,
      totalItems,
      items: items.map((item) => this.mapToHistoryItem(item)),
    };
  }

  private mapToHistoryItem(doc: IWordsUserPuzzle) {
    return {
      userPuzzleId: (doc._id as Types.ObjectId).toString(),
      puzzleId: doc.puzzleId.toString(),
      puzzleWord: doc.puzzleWord,
      date: doc.date,
      status: doc.status,
      attemptsUsed: doc.attemptsUsed,
      maxAttempts: doc.maxAttempts,
      score: doc.score,
      guesses: doc.guesses.map((guess) => ({
        attemptNumber: guess.attemptNumber,
        guessWord: guess.guessWord,
        pattern: guess.pattern,
        createdAt: guess.createdAt.toISOString(),
      })),
      createdAt: doc.createdAt.toISOString(),
      finishedAt: doc.finishedAt ? doc.finishedAt.toISOString() : null,
      firstGuessAt: doc.firstGuessAt ? doc.firstGuessAt.toISOString() : null,
      timeSpentMs: doc.timeSpentMs ?? null,
    };
  }

  private resolveFirstGuessTimestamp(
    guesses: IWordsUserPuzzle["guesses"],
  ): Date | null {
    if (guesses.length === 0) {
      return null;
    }
    const first = guesses.reduce<Date | null>((earliest, current) => {
      if (!earliest) {
        return current.createdAt;
      }
      return current.createdAt < earliest ? current.createdAt : earliest;
    }, null);
    return first;
  }

  private calculateTimeSpentMs(first?: Date | null, finished?: Date | null) {
    if (!first || !finished) {
      return null;
    }
    const diff = finished.getTime() - first.getTime();
    return diff >= 0 ? diff : 0;
  }

  private computeScore(attemptNumber: number) {
    const attemptScores = [10, 8, 6, 4, 3, 2];
    if (attemptNumber <= 0) {
      return 0;
    }
    return attemptScores[attemptNumber - 1] ?? 0;
  }

  private isPastPuzzle(puzzleDate: string) {
    const puzzleDay = this.normalizeDate(puzzleDate);
    const today = this.normalizeDate(new Date().toISOString());
    if (!puzzleDay || !today) {
      return false;
    }
    return puzzleDay.getTime() < today.getTime();
  }

  private normalizeDate(value: string) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    parsed.setUTCHours(0, 0, 0, 0);
    return parsed;
  }
}
