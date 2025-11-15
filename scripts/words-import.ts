import "dotenv/config";
import path from "path";
import { promises as fs } from "fs";
import { connectDb, closeDb } from "../src/mongo";
import { WordsBankEntryModel } from "../src/models/words-bank-entry";

const DATA_DIR = path.resolve(__dirname, "..", "dados");
const FILE_HINTS = ["verbos", "lexico", "conjug"];
const CHUNK_SIZE = 5000;

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
      removeDiacritics(filename).toLowerCase().includes(normalizedHint)
    );

    if (!match) {
      throw new Error(
        `Arquivo contendo '${hint}' não foi encontrado em ${DATA_DIR}`
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

  return Array.from(words).sort();
}

async function insertWords(words: string[]) {
  await WordsBankEntryModel.deleteMany({});
  console.log("Coleção WordsBankEntry limpa.");

  for (let i = 0; i < words.length; i += CHUNK_SIZE) {
    const chunk = words.slice(i, i + CHUNK_SIZE);
    await WordsBankEntryModel.insertMany(
      chunk.map((word) => ({ word, source: "import-script" })),
      { ordered: false }
    );
    process.stdout.write(
      `Inseridos ${Math.min(i + CHUNK_SIZE, words.length)} / ${words.length}\r`
    );
  }

  process.stdout.write("\n");
}

async function main() {
  console.log("Conectando ao MongoDB...");
  await connectDb();

  const files = await resolveWordFiles();
  console.log("Arquivos encontrados:", files.map((file) => path.basename(file)));

  const words = await collectWords(files);
  console.log(`Total de palavras únicas (5 letras): ${words.length}`);

  if (!words.length) {
    throw new Error("Nenhuma palavra válida foi encontrada.");
  }

  await insertWords(words);
  console.log("Importação concluída.");
}

main()
  .catch((error) => {
    console.error("Falha ao importar palavras:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
