import { promises as fs } from "fs";
import path from "path";
import mongoose from "mongoose";
import { WordsBankEntryModel } from "../src/models/words-bank-entry";
import "dotenv/config";

const PALAVRAS_PT_PATH = path.resolve(__dirname, "..", "dados", "palavras_5_letras.txt");
const WORDS_EN_PATH = path.resolve(__dirname, "..", "dados", "valid-wordle-words.txt");

async function loadWords(filePath: string): Promise<Set<string>> {
  const content = await fs.readFile(filePath, "utf-8");
  const words = content
    .split("\n")
    .map((word) => word.trim().toUpperCase())
    .filter((word) => word.length === 5);
  return new Set(words);
}

async function saveWords(filePath: string, words: string[]): Promise<void> {
  const sorted = [...words].sort();
  await fs.writeFile(filePath, sorted.join("\n") + "\n", "utf-8");
}

async function findEnglishWords() {
  console.log("🔍 Procurando palavras em inglês no arquivo de português...\n");

  const palavrasPt = await loadWords(PALAVRAS_PT_PATH);
  const wordsEn = await loadWords(WORDS_EN_PATH);

  console.log(`📊 Estatísticas:`);
  console.log(`   palavras_5_letras.txt: ${palavrasPt.size} palavras`);
  console.log(`   valid-wordle-words.txt: ${wordsEn.size} palavras em inglês\n`);

  // Encontrar palavras que estão em ambos os arquivos (possíveis palavras em inglês)
  const possibleEnglishWords: string[] = [];
  for (const word of palavrasPt) {
    if (wordsEn.has(word)) {
      possibleEnglishWords.push(word);
    }
  }

  if (possibleEnglishWords.length === 0) {
    console.log(`✅ Nenhuma palavra em inglês encontrada!\n`);
    return;
  }

  console.log(`⚠️  Encontradas ${possibleEnglishWords.length} palavras que existem em inglês:\n`);

  // Agrupar por tipo (podem ser palavras válidas em português também)
  const commonWords = possibleEnglishWords.sort();

  // Mostrar as primeiras 50 para revisão
  const displayLimit = 50;
  console.log(`📝 Primeiras ${Math.min(displayLimit, commonWords.length)} palavras:\n`);
  commonWords.slice(0, displayLimit).forEach((word, index) => {
    if (index % 5 === 0 && index > 0) console.log();
    process.stdout.write(`   ${word.padEnd(8)}`);
  });

  if (commonWords.length > displayLimit) {
    console.log(`\n\n   ... e mais ${commonWords.length - displayLimit} palavras`);
  }

  console.log(`\n\n⚠️  IMPORTANTE: Nem todas essas palavras são necessariamente inglesas!`);
  console.log(`   Muitas palavras podem existir em ambos os idiomas (ex: MOTOR, RADIO, etc.)\n`);
  console.log(`📄 Lista completa salva em: dados/possible-english-words.txt\n`);

  // Salvar lista completa em arquivo para revisão manual
  const outputPath = path.resolve(__dirname, "..", "dados", "possible-english-words.txt");
  await fs.writeFile(outputPath, commonWords.join("\n") + "\n", "utf-8");

  console.log(`💡 Próximos passos:`);
  console.log(`   1. Revise o arquivo dados/possible-english-words.txt`);
  console.log(`   2. Identifique quais são APENAS inglesas (não existem em português)`);
  console.log(`   3. Use o comando: npm run words:remove-words <arquivo-com-palavras-para-remover>\n`);
}

findEnglishWords().catch((error) => {
  console.error("Erro:", error);
  process.exit(1);
});
