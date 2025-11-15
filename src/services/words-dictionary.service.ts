import path from "path";
import { promises as fs } from "fs";
import { WordsBankEntryModel } from "../models/words-bank-entry";

const DEFAULT_DICTIONARY_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "dados",
  "words-five-letters.txt",
);

export class WordsDictionaryService {
  private words: Set<string> | null = null;
  private loadPromise: Promise<void> | null = null;

  constructor(
    private readonly dictionaryPath =
      process.env.WORDS_DICTIONARY_PATH ?? DEFAULT_DICTIONARY_PATH,
  ) {}

  async isAllowed(word: string): Promise<boolean> {
    await this.ensureLoaded();
    return this.words?.has(word.toUpperCase()) ?? false;
  }

  private async ensureLoaded() {
    if (this.words) {
      return;
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = (async () => {
      const entries = await this.loadDictionaryEntries();

      if (!entries.length) {
        throw new Error(
          "Words dictionary is empty. Execute npm run words:import novamente.",
        );
      }

      this.words = new Set(entries);
    })();

    return this.loadPromise;
  }

  private async loadDictionaryEntries(): Promise<string[]> {
    const entriesFromFile = await this.loadFromFile();
    if (entriesFromFile.length > 0) {
      return entriesFromFile;
    }

    const documents = await WordsBankEntryModel.find()
      .select({ word: 1 })
      .lean()
      .exec();
    return documents.map((doc) => doc.word.toUpperCase());
  }

  private async loadFromFile(): Promise<string[]> {
    if (!this.dictionaryPath) {
      return [];
    }

    try {
      const content = await fs.readFile(this.dictionaryPath, "utf8");
      return content
        .split(/\r?\n/)
        .map((line) => line.trim().toUpperCase())
        .filter(Boolean);
    } catch (error: any) {
      if (error?.code !== "ENOENT") {
        console.warn(
          `Falha ao ler o dicionário ${this.dictionaryPath}:`,
          error,
        );
      }
      return [];
    }
  }
}
