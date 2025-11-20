import { promises as fs } from "fs";
import path from "path";

const PALAVRAS_PT_PATH = path.resolve(__dirname, "..", "dados", "palavras_5_letras.txt");
const WORDS_EN_PATH = path.resolve(__dirname, "..", "dados", "words-five-letters.txt");

async function loadWords(filePath: string): Promise<Set<string>> {
  const content = await fs.readFile(filePath, "utf-8");
  const words = content
    .split("\n")
    .map((word) => word.trim().toUpperCase())
    .filter((word) => word.length > 0);
  return new Set(words);
}

async function validateConsistency() {
  console.log("🔍 Validando consistência entre os arquivos de palavras...\n");

  const palavrasPt = await loadWords(PALAVRAS_PT_PATH);
  const wordsEn = await loadWords(WORDS_EN_PATH);

  console.log(`📊 Estatísticas:`);
  console.log(`   palavras_5_letras.txt: ${palavrasPt.size} palavras`);
  console.log(`   words-five-letters.txt: ${wordsEn.size} palavras\n`);

  // Verificar palavras de palavras_5_letras.txt que NÃO estão em words-five-letters.txt
  const missingInWordsEn: string[] = [];
  for (const word of palavrasPt) {
    if (!wordsEn.has(word)) {
      missingInWordsEn.push(word);
    }
  }

  if (missingInWordsEn.length > 0) {
    console.log(`❌ PROBLEMA ENCONTRADO!`);
    console.log(
      `   ${missingInWordsEn.length} palavras de palavras_5_letras.txt NÃO estão em words-five-letters.txt:\n`
    );
    missingInWordsEn.sort();
    missingInWordsEn.forEach((word) => {
      console.log(`   - ${word}`);
    });
    console.log(
      `\n⚠️  Isso significa que essas palavras podem ser sorteadas no modo infinito,`
    );
    console.log(`   mas os jogadores NÃO poderão usá-las como guess (validação falhará)!\n`);
    console.log(
      `💡 Execute: npm run words:add-word ${missingInWordsEn[0]} (para adicionar uma por vez)`
    );
    console.log(`   ou adicione manualmente em ambos os arquivos.\n`);
    process.exit(1);
  }

  console.log(`✅ Tudo certo!`);
  console.log(
    `   Todas as palavras de palavras_5_letras.txt estão presentes em words-five-letters.txt.`
  );
  console.log(
    `   O jogo funcionará corretamente (palavras sorteadas podem ser usadas como guess).\n`
  );

  // Info adicional: palavras extras em words-five-letters.txt
  const extraInWordsEn = wordsEn.size - palavrasPt.size;
  if (extraInWordsEn > 0) {
    console.log(`ℹ️  words-five-letters.txt tem ${extraInWordsEn} palavras extras.`);
    console.log(
      `   Isso é OK - jogadores podem usar essas palavras como guess, mas não serão sorteadas.\n`
    );
  }
}

validateConsistency().catch((error) => {
  console.error("Erro:", error);
  process.exit(1);
});
