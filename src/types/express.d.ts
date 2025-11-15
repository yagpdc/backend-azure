import type { IWordsUser } from "../models/words-user";

declare global {
  namespace Express {
    interface Request {
      wordsUser?: IWordsUser;
    }
  }
}

export {};
