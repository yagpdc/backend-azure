import { promises as fs } from "fs";
import path from "path";
import mongoose from "mongoose";
import { WordsBankEntryModel } from "../src/models/words-bank-entry";
import "dotenv/config";

const PALAVRAS_PT_PATH = path.resolve(__dirname, "..", "dados", "palavras_5_letras.txt");
const WORDS_EN_PATH = path.resolve(__dirname, "..", "dados", "words-five-letters.txt");

function normalizeWord(word: string): string {
  return word
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

async function loadWords(filePath: string): Promise<string[]> {
  const content = await fs.readFile(filePath, "utf-8");
  return content
    .split("\n")
    .map((word) => word.trim().toUpperCase())
    .filter((word) => word.length > 0);
}

async function saveWords(filePath: string, words: string[]): Promise<void> {
  const sorted = [...words].sort();
  await fs.writeFile(filePath, sorted.join("\n") + "\n", "utf-8");
}

async function removeWordFromFile(filePath: string, word: string): Promise<boolean> {
  const words = await loadWords(filePath);
  const idx = words.indexOf(word);
  if (idx === -1) return false;
  words.splice(idx, 1);
  await saveWords(filePath, words);
  return true;
}

async function removeWordFromDatabase(word: string): Promise<boolean> {
  const res = await WordsBankEntryModel.findOneAndDelete({ word });
  return !!res;
}

async function removeWord(inputWord: string) {
  if (!inputWord || inputWord.trim().length === 0) {
    console.error("❌ Erro: Palavra não fornecida!");
    console.log("   Uso: npm run words:remove-word -- RUIVA");
    process.exit(1);
  }

  const word = normalizeWord(inputWord);

  if (word.length !== 5) {
    console.error(`❌ Erro: A palavra "${word}" não tem 5 letras!`);
    process.exit(1);
  }

  console.log(`\n🔤 Removendo palavra: ${word}\n`);

  // 1. Remover de palavras_5_letras.txt
  try {
    const removedPt = await removeWordFromFile(PALAVRAS_PT_PATH, word);
    if (removedPt) {
      console.log(`✅ Removida de: palavras_5_letras.txt`);
    } else {
      console.log(`ℹ️  Não encontrada em: palavras_5_letras.txt`);
    }
  } catch (err) {
    console.error(`❌ Erro ao remover de palavras_5_letras.txt:`, err);
  }

  // 2. Remover de words-five-letters.txt
  try {
    const removedEn = await removeWordFromFile(WORDS_EN_PATH, word);
    if (removedEn) {
      console.log(`✅ Removida de: words-five-letters.txt`);
    } else {
      console.log(`ℹ️  Não encontrada em: words-five-letters.txt`);
    }
  } catch (err) {
    console.error(`❌ Erro ao remover de words-five-letters.txt:`, err);
  }

  // 3. Conectar ao MongoDB e remover do banco
  try {
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/wordsdb";
    await mongoose.connect(mongoUri);
    console.log(`🔌 Conectado ao MongoDB`);

    const removedDb = await removeWordFromDatabase(word);
    if (removedDb) {
      console.log(`✅ Removida no banco de dados (WordsBankEntry)`);
    } else {
      console.log(`ℹ️  Não encontrada no banco de dados`);
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("\n❌ Erro ao conectar ao MongoDB:", error);
    console.log(
      "\n⚠️  A palavra foi removida dos arquivos locais (se aplicável), mas não do banco de dados."
    );
    console.log("   Verifique `MONGODB_URI` e tente novamente.\n");
    process.exit(1);
  }

  console.log(`\n✨ Concluído! A palavra "${word}" foi removida (quando encontrada).\n`);
}

const inputWord = process.argv[2];
removeWord(inputWord).catch((error) => {
  console.error("Erro:", error);
  process.exit(1);
});
