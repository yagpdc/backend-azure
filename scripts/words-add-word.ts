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

async function addWordToFile(filePath: string, word: string): Promise<boolean> {
  const words = await loadWords(filePath);
  const wordsSet = new Set(words);

  if (wordsSet.has(word)) {
    return false; // Palavra já existe
  }

  words.push(word);
  await saveWords(filePath, words);
  return true;
}

async function addWordToDatabase(word: string): Promise<boolean> {
  const existing = await WordsBankEntryModel.findOne({ word });
  if (existing) {
    return false; // Palavra já existe
  }

  await WordsBankEntryModel.create({ word });
  return true;
}

async function addWord(inputWord: string) {
  if (!inputWord || inputWord.trim().length === 0) {
    console.error("❌ Erro: Palavra não fornecida!");
    console.log("   Uso: npm run words:add-word RUIVA");
    process.exit(1);
  }

  const word = normalizeWord(inputWord);

  if (word.length !== 5) {
    console.error(`❌ Erro: A palavra "${word}" não tem 5 letras!`);
    process.exit(1);
  }

  console.log(`\n🔤 Adicionando palavra: ${word}\n`);

  // 1. Adicionar em palavras_5_letras.txt
  const addedToPalavrasPt = await addWordToFile(PALAVRAS_PT_PATH, word);
  if (addedToPalavrasPt) {
    console.log(`✅ Adicionada em: palavras_5_letras.txt`);
  } else {
    console.log(`ℹ️  Já existe em: palavras_5_letras.txt`);
  }

  // 2. Adicionar em words-five-letters.txt
  const addedToWordsEn = await addWordToFile(WORDS_EN_PATH, word);
  if (addedToWordsEn) {
    console.log(`✅ Adicionada em: words-five-letters.txt`);
  } else {
    console.log(`ℹ️  Já existe em: words-five-letters.txt`);
  }

  // 3. Conectar ao MongoDB e adicionar ao banco
  try {
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/wordsdb";
    await mongoose.connect(mongoUri);
    console.log(`🔌 Conectado ao MongoDB`);

    const addedToDb = await addWordToDatabase(word);
    if (addedToDb) {
      console.log(`✅ Adicionada no banco de dados (WordsBankEntry)`);
    } else {
      console.log(`ℹ️  Já existe no banco de dados`);
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("\n❌ Erro ao conectar ao MongoDB:", error);
    console.log(
      "\n⚠️  A palavra foi adicionada nos arquivos locais, mas não no banco de dados."
    );
    console.log("   Execute npm run words:import para sincronizar o banco.\n");
    process.exit(1);
  }

  console.log(`\n✨ Concluído! A palavra "${word}" foi adicionada com sucesso.\n`);
}

const inputWord = process.argv[2];
addWord(inputWord).catch((error) => {
  console.error("Erro:", error);
  process.exit(1);
});
