import {
  type CreateWordsPuzzleDto,
  WordsPuzzleModel,
  type IWordsPuzzle,
} from "../models/words-puzzle";

interface ListPuzzlesParams {
  page?: number;
  pageSize?: number;
}

export class WordsPuzzlesService {
  private normalizeDate(inputDate: string | Date) {
    const date =
      typeof inputDate === "string" ? new Date(inputDate) : inputDate;
    if (Number.isNaN(date.getTime())) {
      throw new Error("Invalid date provided");
    }

    return date.toISOString().slice(0, 10);
  }

  async createPuzzle(dto: CreateWordsPuzzleDto): Promise<IWordsPuzzle> {
    const normalizedDate = this.normalizeDate(dto.date);

    return WordsPuzzleModel.create({
      date: normalizedDate,
      puzzleWord: dto.puzzleWord.toUpperCase(),
      maxAttempts: dto.maxAttempts,
      metadata: dto.metadata ?? {},
    });
  }

  list({ page = 1, pageSize = 20 }: ListPuzzlesParams = {}) {
    const currentPage = page < 1 ? 1 : page;
    const currentPageSize = Math.min(Math.max(pageSize, 1), 100);
    const skip = (currentPage - 1) * currentPageSize;

    return Promise.all([
      WordsPuzzleModel.find()
        .sort({ date: -1 })
        .skip(skip)
        .limit(currentPageSize),
      WordsPuzzleModel.countDocuments(),
    ]).then(([items, totalItems]) => {
      const totalPages =
        totalItems === 0 ? 0 : Math.ceil(totalItems / currentPageSize);
      return {
        page: currentPage,
        pageSize: currentPageSize,
        totalItems,
        totalPages,
        items,
      };
    });
  }

  findById(id: string) {
    return WordsPuzzleModel.findById(id);
  }

  findByDate(date: string | Date) {
    const normalizedDate = this.normalizeDate(date);
    return WordsPuzzleModel.findOne({ date: normalizedDate });
  }
}
