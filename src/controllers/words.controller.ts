import type { Request, Response } from "express";
import {
  CreateWordsPuzzleDtoSchema,
  type IWordsPuzzle,
} from "../models/words-puzzle";
import { CreateWordsHistoryEntrySchema } from "../models/words-user-puzzle";
import { SubmitDailyGuessSchema } from "../models/words-daily-guess";
import { UpdateWordsAvatarSchema } from "../models/words-avatar";
import { WordsPuzzlesService } from "../services/words-puzzles.service";
import {
  WordsHistoryService,
  WordsHistoryError,
} from "../services/words-history.service";
import { WordsBankService } from "../services/words-bank.service";
import {
  WordsDailyGameError,
  WordsDailyGameService,
} from "../services/words-daily-game.service";
import { WordsUsersService } from "../services/words-users.service";
import { isTestWordsUser } from "../utils/words-test-user";
import {
  getWordsAvatarOptions,
  normalizeAvatarConfig,
  normalizeAvatarPayload,
} from "../utils/words-avatar";
import type { IWordsUser } from "../models/words-user";

export class WordsController {
  private readonly puzzlesService = new WordsPuzzlesService();
  private readonly historyService = new WordsHistoryService();
  private readonly bankService = new WordsBankService();
  private readonly dailyGameService = new WordsDailyGameService();
  private readonly usersService = new WordsUsersService();

  getProfile = (req: Request, res: Response) => {
    const user = req.wordsUser!;
    return res.json(this.mapProfile(user));
  };

  updateAvatar = async (req: Request, res: Response) => {
    const validation = UpdateWordsAvatarSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.issues });
    }

    try {
      const avatar = normalizeAvatarPayload({
        frogType: validation.data.frogType,
        hat: validation.data.hat ?? null,
        body: validation.data.body ?? null,
        background: validation.data.background ?? null,
      });

      const updatedUser =
        (await this.usersService.updateAvatar(userId(req), avatar)) ?? null;
      if (!updatedUser) {
        return res.status(404).json({ error: "Words user not found" });
      }

      req.wordsUser = updatedUser;
      return res.json(this.mapProfile(updatedUser));
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  };

  getHistory = async (req: Request, res: Response) => {
    try {
      const page = parseQueryNumber(req.query.page, 1, { min: 1 });
      const pageSize = parseQueryNumber(req.query.pageSize, 10, {
        min: 1,
        max: 100,
      });

      if (isTestWordsUser(req.wordsUser)) {
        return res.json({
          page,
          pageSize,
          totalPages: 0,
          totalItems: 0,
          items: [],
        });
      }

      const history = await this.historyService.paginateHistory(userId(req), {
        page,
        pageSize,
      });
      return res.json(history);
    } catch (error: any) {
      if (error instanceof WordsDailyGameError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ error: error.message });
    }
  };

  createHistoryEntry = async (req: Request, res: Response) => {
    const validation = CreateWordsHistoryEntrySchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.issues });
    }

    if (isTestWordsUser(req.wordsUser)) {
      return res.status(403).json({
        error: "History recording is disabled for the test account",
      });
    }

    try {
      const puzzle = await this.puzzlesService.findById(
        validation.data.puzzleId,
      );
      if (!puzzle) {
        return res.status(404).json({ error: "Puzzle not found" });
      }

      const result = await this.historyService.createEntry(
        req.wordsUser!,
        puzzle,
        validation.data,
      );
      req.wordsUser = result.user;

      return res.status(201).json({
        user: {
          id: result.user.id,
          name: result.user.name,
          streak: result.user.streak,
          score: result.user.score ?? 0,
        },
        historyItem: result.historyItem,
      });
    } catch (error: any) {
      if (error instanceof WordsHistoryError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ error: error.message });
    }
  };

  getDailyPuzzle = async (req: Request, res: Response) => {
    try {
      const dateParam =
        typeof req.query.date === "string" ? req.query.date : undefined;
      const dailyIdParam =
        typeof req.query.dailyId === "string" ? req.query.dailyId : undefined;

      const status = await this.dailyGameService.getDailyStatus({
        user: req.wordsUser!,
        targetDate: resolveTargetDate(dateParam, dailyIdParam),
      });

      return res.json({
        puzzle: status.puzzle,
        status: status.status,
        attemptsUsed: status.attemptsUsed,
        remainingAttempts: status.remainingAttempts,
        finishedAt: status.finishedAt ? status.finishedAt.toISOString() : null,
        scoreAwarded: status.scoreAwarded,
        guesses: status.guesses.map((guess) => ({
          attemptNumber: guess.attemptNumber,
          guessWord: guess.guessWord,
          letters: guess.letters,
          pattern: guess.pattern,
          createdAt: guess.createdAt.toISOString(),
        })),
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  };

  submitDailyGuess = async (req: Request, res: Response) => {
    const validation = SubmitDailyGuessSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.issues });
    }

    try {
      const result = await this.dailyGameService.submitGuess({
        user: req.wordsUser!,
        guessWord: validation.data.guessWord,
        targetDate: resolveTargetDate(
          validation.data.date,
          validation.data.dailyId,
        ),
      });

      req.wordsUser = result.user;

      return res.json({
        puzzle: result.puzzle,
        attempt: {
          attemptNumber: result.attemptNumber,
          letters: result.evaluation.letters,
          pattern: result.evaluation.pattern,
        },
        status: result.status,
        attemptsUsed: result.attemptsUsed,
        remainingAttempts: result.remainingAttempts,
        finishedAt: result.finishedAt ? result.finishedAt.toISOString() : null,
        scoreAwarded: result.scoreAwarded,
        userScore: result.userScore,
      });
    } catch (error: any) {
      if (error instanceof WordsDailyGameError) {
        return res.status(error.statusCode).json({
          error: error.message,
          ...(error.details ? { details: error.details } : {}),
        });
      }
      return res.status(500).json({ error: error.message });
    }
  };

  listPuzzles = async (req: Request, res: Response) => {
    try {
      const page = parseQueryNumber(req.query.page, 1, { min: 1 });
      const pageSize = parseQueryNumber(req.query.pageSize, 20, {
        min: 1,
        max: 100,
      });

      const result = await this.puzzlesService.list({ page, pageSize });
      return res.json({
        ...result,
        items: result.items.map((puzzle) => this.mapPuzzle(puzzle)),
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  };

  createPuzzle = async (req: Request, res: Response) => {
    const validation = CreateWordsPuzzleDtoSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.issues });
    }

    try {
      const puzzle = await this.puzzlesService.createPuzzle(validation.data);
      return res.status(201).json(this.mapPuzzle(puzzle));
    } catch (error: any) {
      if (error?.code === 11000) {
        return res
          .status(409)
          .json({ error: "Puzzle already exists for date" });
      }
      return res.status(500).json({ error: error.message });
    }
  };

  getInfiniteRandomWord = async (_req: Request, res: Response) => {
    try {
      const word = await this.bankService.getRandomWord();
      return res.json({ word });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  };

  listInfiniteWords = async (req: Request, res: Response) => {
    try {
      const page = parseQueryNumber(req.query.page, 1, { min: 1 });
      const pageSize = parseQueryNumber(req.query.pageSize, 100, {
        min: 1,
        max: 500,
      });

      const result = await this.bankService.listWords({
        page,
        pageSize,
      });

      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  };

  private mapPuzzle(puzzle: IWordsPuzzle) {
    return {
      puzzleId: puzzle.id,
      puzzleWord: puzzle.puzzleWord,
      date: puzzle.date,
      maxAttempts: puzzle.maxAttempts,
      metadata: puzzle.metadata ?? {},
      createdAt: puzzle.createdAt.toISOString(),
      updatedAt: puzzle.updatedAt.toISOString(),
    };
  }

  getRanking = async (_req: Request, res: Response) => {
    try {
      const players = await this.usersService.listRanking();
      return res.json(
        players.map((player) => ({
          id: String(player._id),
          name: player.name,
          streak: player.streak ?? 0,
          score: player.score ?? 0,
          totalTimeSpentMs: player.totalTimeSpentMs ?? 0,
          avatar: this.resolveAvatarFromConfig(
            player.config as Record<string, unknown> | undefined,
          ),
        })),
      );
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  };

  listAvatarOptions = (_req: Request, res: Response) => {
    return res.json(getWordsAvatarOptions());
  };

  private mapProfile(user: IWordsUser) {
    return {
      id: user.id,
      name: user.name,
      streak: user.streak,
      score: user.score ?? 0,
      config: this.buildUserConfig(user),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  private buildUserConfig(user: IWordsUser) {
    const baseConfig = this.normalizeUserConfig(user.config);

    return {
      ...baseConfig,
      avatar: this.resolveAvatarFromConfig(baseConfig),
    };
  }

  private normalizeUserConfig(
    config: IWordsUser["config"],
  ): Record<string, unknown> {
    if (config && typeof config === "object") {
      return { ...(config as Record<string, unknown>) };
    }
    return {};
  }

  private resolveAvatarFromConfig(
    config?: Record<string, unknown>,
  ): ReturnType<typeof normalizeAvatarConfig> {
    const avatarValue =
      config && typeof config === "object"
        ? (config as { avatar?: unknown }).avatar
        : undefined;
    return normalizeAvatarConfig(avatarValue);
  }
}

function userId(req: Request) {
  if (!req.wordsUser) throw new Error("Words user missing in request");
  return req.wordsUser.id;
}

function parseQueryNumber(
  value: unknown,
  defaultValue: number,
  options: { min?: number; max?: number } = {},
) {
  if (value === undefined || value === null) {
    return defaultValue;
  }

  const parsed = Number(value);
  const safeNumber = Number.isFinite(parsed) ? parsed : defaultValue;
  const min = options.min ?? Number.NEGATIVE_INFINITY;
  const max = options.max ?? Number.POSITIVE_INFINITY;

  return Math.max(min, Math.min(max, safeNumber));
}

function resolveTargetDate(date?: string, dailyId?: string) {
  if (date) {
    return date;
  }
  if (dailyId) {
    return `${dailyId.slice(0, 4)}-${dailyId.slice(4, 6)}-${dailyId.slice(6, 8)}`;
  }
  return undefined;
}
