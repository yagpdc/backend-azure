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

export class WordsHistoryService {
  constructor(private readonly usersService = new WordsUsersService()) {}

  async createEntry(
    user: IWordsUser,
    puzzle: IWordsPuzzle,
    dto: CreateWordsHistoryEntryDto,
  ) {
    const guesses = (dto.guesses ?? []).map((guess) => ({
      attemptNumber: guess.attemptNumber,
      guessWord: guess.guessWord.toUpperCase(),
      pattern: guess.pattern,
      createdAt: guess.createdAt ? new Date(guess.createdAt) : new Date(),
    }));

    const finishedAt = dto.finishedAt ? new Date(dto.finishedAt) : null;
    const firstGuessAt = dto.firstGuessAt
      ? new Date(dto.firstGuessAt)
      : this.resolveFirstGuessTimestamp(guesses);
    const timeSpentMs =
      typeof dto.timeSpentMs === "number"
        ? dto.timeSpentMs
        : this.calculateTimeSpentMs(firstGuessAt, finishedAt);

    const entry = await WordsUserPuzzleModel.create({
      userId: user._id,
      puzzleId: puzzle._id,
      puzzleWord: puzzle.puzzleWord,
      date: puzzle.date,
      status: dto.status,
      attemptsUsed: dto.attemptsUsed,
      maxAttempts: dto.maxAttempts ?? puzzle.maxAttempts,
      score: dto.score ?? 0,
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
        scoreIncrement: dto.score ?? 0,
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
}
