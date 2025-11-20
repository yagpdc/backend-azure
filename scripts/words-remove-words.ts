import { promises as fs } from "fs";
import path from "path";
import mongoose from "mongoose";
import { WordsBankEntryModel } from "../src/models/words-bank-entry";
import "dotenv/config";

const PALAVRAS_PT_PATH = path.resolve(__dirname, "..", "dados", "palavras_5_letras.txt");
const WORDS_FULL_PATH = path.resolve(__dirname, "..", "dados", "words-five-letters.txt");

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

async function removeWords(wordsToRemoveFile: string) {
  if (!wordsToRemoveFile || wordsToRemoveFile.trim().length === 0) {
    console.error("❌ Erro: Arquivo com palavras não fornecido!");
    console.log("   Uso: npm run words:remove-words dados/palavras-para-remover.txt");
    process.exit(1);
  }

  const removeFilePath = path.resolve(wordsToRemoveFile);

  try {
    await fs.access(removeFilePath);
  } catch {
    console.error(`❌ Erro: Arquivo não encontrado: ${removeFilePath}`);
    process.exit(1);
  }

  console.log(`\n🗑️  Removendo palavras do arquivo: ${path.basename(removeFilePath)}\n`);

  // Carregar palavras a serem removidas
  const wordsToRemove = new Set(await loadWords(removeFilePath));
  console.log(`📋 ${wordsToRemove.size} palavras para remover\n`);

  if (wordsToRemove.size === 0) {
    console.log("⚠️  Nenhuma palavra para remover!");
    process.exit(0);
  }

  // 1. Remover de palavras_5_letras.txt
  const palavrasPt = await loadWords(PALAVRAS_PT_PATH);
  const palavrasPtFiltered = palavrasPt.filter((word) => !wordsToRemove.has(word));
  const removedFromPt = palavrasPt.length - palavrasPtFiltered.length;

  if (removedFromPt > 0) {
    await saveWords(PALAVRAS_PT_PATH, palavrasPtFiltered);
    console.log(`✅ Removidas ${removedFromPt} palavras de: palavras_5_letras.txt`);
  } else {
    console.log(`ℹ️  Nenhuma palavra encontrada em: palavras_5_letras.txt`);
  }

  // 2. Remover de words-five-letters.txt
  const wordsFull = await loadWords(WORDS_FULL_PATH);
  const wordsFullFiltered = wordsFull.filter((word) => !wordsToRemove.has(word));
  const removedFromFull = wordsFull.length - wordsFullFiltered.length;

  if (removedFromFull > 0) {
    await saveWords(WORDS_FULL_PATH, wordsFullFiltered);
    console.log(`✅ Removidas ${removedFromFull} palavras de: words-five-letters.txt`);
  } else {
    console.log(`ℹ️  Nenhuma palavra encontrada em: words-five-letters.txt`);
  }

  // 3. Conectar ao MongoDB e remover do banco
  try {
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/wordsdb";
    await mongoose.connect(mongoUri);
    console.log(`🔌 Conectado ao MongoDB`);

    const wordsArray = Array.from(wordsToRemove);
    const deleteResult = await WordsBankEntryModel.deleteMany({
      word: { $in: wordsArray },
    });

    if (deleteResult.deletedCount > 0) {
      console.log(`✅ Removidas ${deleteResult.deletedCount} palavras do banco de dados`);
    } else {
      console.log(`ℹ️  Nenhuma palavra encontrada no banco de dados`);
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("\n❌ Erro ao conectar ao MongoDB:", error);
    console.log(
      "\n⚠️  As palavras foram removidas dos arquivos locais, mas não do banco de dados."
    );
    console.log("   Execute npm run words:import para sincronizar o banco.\n");
    process.exit(1);
  }

  const totalRemoved = Math.max(removedFromPt, removedFromFull);
  console.log(`\n✨ Concluído! ${totalRemoved} palavra(s) removida(s) com sucesso.\n`);
}

const inputFile = process.argv[2];
removeWords(inputFile).catch((error) => {
  console.error("Erro:", error);
  process.exit(1);
});
