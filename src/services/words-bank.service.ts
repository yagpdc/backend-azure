import { WordsBankEntryModel } from "../models/words-bank-entry";

interface ListWordsParams {
  page?: number;
  pageSize?: number;
}

export class WordsBankService {
  async getRandomWord() {
    const [entry] = await WordsBankEntryModel.aggregate([
      { $sample: { size: 1 } },
    ]);

    if (!entry) {
      throw new Error("Words bank is empty");
    }

    return entry.word;
  }

  async listWords({ page = 1, pageSize = 100 }: ListWordsParams = {}) {
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(Math.max(pageSize, 1), 500);
    const skip = (safePage - 1) * safePageSize;

    const [items, totalItems] = await Promise.all([
      WordsBankEntryModel.find()
        .sort({ word: 1 })
        .skip(skip)
        .limit(safePageSize)
        .lean()
        .exec(),
      WordsBankEntryModel.countDocuments(),
    ]);

    const totalPages =
      totalItems === 0 ? 0 : Math.ceil(totalItems / safePageSize);

    return {
      page: safePage,
      pageSize: safePageSize,
      totalItems,
      totalPages,
      items: items.map((item) => item.word),
    };
  }
}
