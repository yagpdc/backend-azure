import { WordsUserModel, type IWordsUser } from "../models/words-user";
import type { WordsAvatarConfig } from "../config/words-avatar";
import { getTestUserName } from "../utils/words-test-user";

const regexEscape = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export class WordsUsersService {
  findById(id: string) {
    return WordsUserModel.findById(id);
  }

  findByName(name: string) {
    return WordsUserModel.findOne({
      name: { $regex: `^${regexEscape(name)}$`, $options: "i" },
    });
  }

  async incrementStreak(
    userId: string,
    {
      streakIncrement = 1,
      scoreIncrement = 0,
      timeSpentIncrement = 0,
    }: {
      streakIncrement?: number;
      scoreIncrement?: number;
      timeSpentIncrement?: number;
    } = {},
  ): Promise<IWordsUser | null> {
    const inc: Record<string, number> = {};
    if (streakIncrement !== 0) {
      inc.streak = streakIncrement;
    }
    if (scoreIncrement !== 0) {
      inc.score = scoreIncrement;
    }
    if (timeSpentIncrement !== 0) {
      inc.totalTimeSpentMs = timeSpentIncrement;
    }

    if (Object.keys(inc).length === 0) {
      return WordsUserModel.findById(userId);
    }

    return WordsUserModel.findByIdAndUpdate(
      userId,
      { $inc: inc },
      { new: true },
    );
  }

  listRanking() {
    const testUserName = getTestUserName();
    const filter = testUserName ? { name: { $ne: testUserName } } : {};

    return WordsUserModel.find(filter)
      .sort({ score: -1, totalTimeSpentMs: 1, updatedAt: 1, createdAt: 1 })
      .select({
        name: 1,
        score: 1,
        streak: 1,
        updatedAt: 1,
        totalTimeSpentMs: 1,
        config: 1,
        infiniteRecord: 1,
      })
      .lean();
  }

  updateAvatar(userId: string, avatar: WordsAvatarConfig) {
    return WordsUserModel.findByIdAndUpdate(
      userId,
      {
        $set: {
          "config.avatar": avatar,
        },
      },
      { new: true },
    );
  }

  updateInfiniteProgress(
    userId: string,
    {
      currentScore,
      record,
      status,
    }: {
      currentScore?: number;
      record?: number;
      status?: IWordsUser["infiniteStatus"];
    },
  ) {
    const $set: Record<string, unknown> = {};
    if (typeof currentScore === "number") {
      $set.infiniteCurrentScore = currentScore;
    }
    if (typeof record === "number") {
      $set.infiniteRecord = record;
    }
    if (status) {
      $set.infiniteStatus = status;
    }

    if (!Object.keys($set).length) {
      return WordsUserModel.findById(userId);
    }

    return WordsUserModel.findByIdAndUpdate(userId, { $set }, { new: true });
  }
}
