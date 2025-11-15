interface WordsCredentialEntry {
  account: string;
  password: string;
  userId?: string;
}

const DEFAULT_ACCOUNT = process.env.WORDS_ADMIN_USER ?? "admin";
const DEFAULT_PASSWORD = process.env.WORDS_ADMIN_PASSWORD ?? "%3x0v7STOh@d";

export class WordsCredentialService {
  private readonly entries: WordsCredentialEntry[];

  constructor(rawValue = process.env.WORDS_CREDENTIALS) {
    const parsed = this.parse(rawValue);
    if (parsed.length > 0) {
      this.entries = parsed;
    } else if (DEFAULT_ACCOUNT && DEFAULT_PASSWORD) {
      this.entries = [{ account: DEFAULT_ACCOUNT, password: DEFAULT_PASSWORD }];
    } else {
      this.entries = [];
    }
  }

  private parse(rawValue?: string): WordsCredentialEntry[] {
    if (!rawValue || !rawValue.trim()) {
      return [];
    }

    return rawValue.split(",").map((entry) => {
      const [account, password, userId] = entry
        .split(":")
        .map((value) => value.trim());

      if (!account || !password) {
        throw new Error(
          "WORDS_CREDENTIALS entry must follow the format account:password[:userId]",
        );
      }

      return { account, password, userId: userId || undefined };
    });
  }

  resolve(account?: string, password?: string): WordsCredentialEntry | null {
    if (!account || !password || this.entries.length === 0) {
      return null;
    }

    const match = this.entries.find(
      (entry) => entry.account === account && entry.password === password,
    );

    return match ?? null;
  }

  hasCredentials(): boolean {
    return this.entries.length > 0;
  }
}
