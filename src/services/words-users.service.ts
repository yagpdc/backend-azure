import { WordsUserModel, type IWordsUser } from "../models/words-user";

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
    }: { streakIncrement?: number; scoreIncrement?: number } = {},
  ): Promise<IWordsUser | null> {
    const inc: Record<string, number> = {};
    if (streakIncrement !== 0) {
      inc.streak = streakIncrement;
    }
    if (scoreIncrement !== 0) {
      inc.score = scoreIncrement;
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
    return WordsUserModel.find()
      .sort({ score: -1, streak: -1, createdAt: 1 })
      .select({ name: 1, score: 1, streak: 1 })
      .lean();
  }
}
