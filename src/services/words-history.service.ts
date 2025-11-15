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
    });

    const updatedUser =
      (await this.usersService.incrementStreak(user.id, {
        streakIncrement: 1,
        scoreIncrement: dto.score ?? 0,
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
    };
  }
}
