import "dotenv/config";
import path from "path";
import { promises as fs } from "fs";
import { connectDb, closeDb } from "../src/mongo";
import { WordsPuzzleModel } from "../src/models/words-puzzle";

const TOTAL_PUZZLES =
  Number(process.argv[2]) && Number(process.argv[2]) > 0
    ? Number(process.argv[2])
    : 400;
const DATA_DIR = path.resolve(__dirname, "..", "dados");
const FILE_HINTS = ["verbos", "lexico", "conjug"];

const removeDiacritics = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const sanitizeWord = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const letters = removeDiacritics(trimmed)
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase();

  if (letters.length !== 5) {
    return null;
  }

  return letters;
};

async function resolveWordFiles() {
  const filenames = await fs.readdir(DATA_DIR);
  return FILE_HINTS.map((hint) => {
    const normalizedHint = hint.toLowerCase();
    const match = filenames.find((filename) =>
      removeDiacritics(filename).toLowerCase().includes(normalizedHint),
    );

    if (!match) {
      throw new Error(
        `Arquivo contendo '${hint}' não foi encontrado em ${DATA_DIR}`,
      );
    }

    return path.join(DATA_DIR, match);
  });
}

async function collectWords(filePaths: string[]) {
  const words = new Set<string>();

  for (const filePath of filePaths) {
    const content = await fs.readFile(filePath, "utf8");
    const lines = content.split(/\r?\n/);

    for (const line of lines) {
      const word = sanitizeWord(line);
      if (word) {
        words.add(word);
      }
    }
  }

  return Array.from(words);
}

const formatDate = (date: Date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;

const addDays = (dateStr: string, amount: number) => {
  const reference = new Date(`${dateStr}T00:00:00Z`);
  reference.setUTCDate(reference.getUTCDate() + amount);
  return formatDate(reference);
};

const shuffle = <T>(items: T[]) => {
  const clone = [...items];
  for (let index = clone.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [clone[index], clone[randomIndex]] = [clone[randomIndex], clone[index]];
  }
  return clone;
};

async function main() {
  console.log("Conectando ao MongoDB para criar puzzles diários...");
  await connectDb();

  const [latestPuzzle, existingWords, wordFiles] = await Promise.all([
    WordsPuzzleModel.findOne().sort({ date: -1 }).lean(),
    WordsPuzzleModel.find().select({ puzzleWord: 1, _id: 0 }).lean(),
    resolveWordFiles(),
  ]);

  const usedWords = new Set(existingWords.map((entry) => entry.puzzleWord));
  const wordPool = (await collectWords(wordFiles)).filter(
    (word) => !usedWords.has(word),
  );

  if (wordPool.length < TOTAL_PUZZLES) {
    throw new Error(
      `Não há palavras suficientes para gerar ${TOTAL_PUZZLES} puzzles (disponíveis: ${wordPool.length}).`,
    );
  }

  const shuffled = shuffle(wordPool);
  const selectedWords = shuffled.slice(0, TOTAL_PUZZLES);

  const today = formatDate(new Date());
  const latestDate = latestPuzzle?.date ?? today;
  const startFrom =
    latestDate > today ? addDays(latestDate, 1) : addDays(today, 1);

  const documents: Array<{
    date: string;
    puzzleWord: string;
    maxAttempts: number;
    metadata: Record<string, unknown>;
  }> = [];

  for (let index = 0; index < selectedWords.length; index += 1) {
    const date = index === 0 ? startFrom : addDays(documents[index - 1].date, 1);
    documents.push({
      date,
      puzzleWord: selectedWords[index],
      maxAttempts: 6,
      metadata: { source: "seed-puzzles-script", order: index + 1 },
    });
  }

  await WordsPuzzleModel.insertMany(documents, { ordered: true });

  const lastDate = documents[documents.length - 1]?.date ?? startFrom;
  console.log(
    `Criados ${documents.length} puzzles entre ${documents[0].date} e ${lastDate}.`,
  );
}

main()
  .catch((error) => {
    console.error("Falha ao criar puzzles diários:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
