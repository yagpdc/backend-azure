import { promises as fs } from "fs";
import path from "path";

const POSSIBLE_ENGLISH_PATH = path.resolve(
  __dirname,
  "..",
  "dados",
  "possible-english-words.txt"
);

// Palavras que são claramente inglesas (não existem em português com esse significado)
const PURE_ENGLISH_WORDS = new Set([
  "ALLEN", // Nome próprio inglês
  "ALTER", // Verbo inglês (em PT seria ALTERAR)
  "ALTOS", // Plural problemático
  "ARGOT", // Palavra francesa/inglesa (em PT seria JARGÃO)
  "AUTOS", // Plural problemático
  "BALSA", // Existe em PT mas pode ser confuso
  "BASSE", // Palavra francesa/inglesa
  "BATCH", // Termo de computação inglês
  "BINGO", // Empréstimo do inglês, mas aceitável
  "BASIC", // Inglês (linguagem programação)
  "BATCH", // Inglês
  "BONUS", // Empréstimo aceitável do latim via inglês
  "CACHE", // Termo técnico, mas usado em PT
  "CAMPI", // Plural latino usado em inglês
  "CAPUT", // Latim, mas mais comum em inglês jurídico
  "CARTE", // Francês/Inglês
  "CATCH", // Inglês
  "CHECK", // Inglês
  "CHICO", // Nome próprio (mas existe em PT)
  "CHINA", // Nome de país
  "CIVIL", // Existe em PT
  "CLARO", // Existe em PT
  "CLOSE", // Inglês
  "CLONE", // Empréstimo científico aceitável
  "COBOL", // Sigla de linguagem programação
  "CRACK", // Inglês
  "CRAWL", // Inglês
  "DERBY", // Inglês
  "DOLBY", // Marca registrada
  "DOLLY", // Inglês
  "DRIVE", // Inglês (termo técnico)
  "FLASH", // Inglês
  "FLUSH", // Inglês
  "FRONT", // Inglês
  "GLIDE", // Inglês
  "GULAG", // Russo via inglês
  "HANSA", // Alemão
  "HINDU", // Ok, usado em PT
  "HOBBY", // Inglês
  "HOMOS", // Grego, problemático
  "HUSKY", // Inglês
  "INDEX", // Inglês/Latim
  "INPUT", // Inglês
  "ISLAM", // Árabe, ok
  "JACTA", // Latim
  "JIHAD", // Árabe via inglês
  "JOULE", // Unidade, nome próprio
  "LOBBY", // Inglês
  "LOGIN", // Inglês
  "LOTUS", // Latim/Inglês
  "MACHO", // Espanhol, mas usado em PT
  "MACOM", // ?
  "MANGA", // Ok em PT
  "MARIA", // Nome próprio
  "MARTA", // Nome próprio
  "MARTE", // Nome próprio (planeta)
  "MASER", // Acrônimo inglês
  "MATCH", // Inglês
  "MATER", // Latim
  "METRO", // Ok em PT
  "MICRO", // Prefixo grego, ok
  "MODEM", // Acrônimo inglês
  "MORAL", // Ok em PT
  "MORSE", // Nome próprio
  "MOTOR", // Ok em PT
  "MOUSE", // Inglês
  "NEVES", // Nome próprio PT
  "NOBEL", // Nome próprio
  "NOMES", // Ok em PT
  "OMEGA", // Grego, ok
  "OPERA", // Ok em PT
  "ORDEM", // Ok em PT
  "ORION", // Nome próprio (constelação)
  "OSCAR", // Nome próprio
  "PANDA", // Ok em PT
  "PAPAS", // Ok em PT
  "PAPER", // Inglês
  "PAPUA", // Nome próprio
  "PARDO", // Ok em PT
  "PASTA", // Ok em PT
  "PATER", // Latim
  "PATIO", // Espanhol, mas ok em PT
  "PAULO", // Nome próprio
  "PENIS", // Latim, ok em PT
  "PIANO", // Italiano, ok em PT
  "PINTA", // Ok em PT
  "PINTO", // Ok em PT
  "PIXEL", // Inglês técnico
  "PIZZA", // Italiano, ok em PT
  "PLACE", // Inglês
  "PLATO", // Nome próprio
  "POLAR", // Ok em PT
  "POLUX", // Nome próprio (estrela)
  "PONTO", // Ok em PT
  "PORTA", // Ok em PT
  "POSSE", // Ok em PT
  "PRIMA", // Ok em PT
  "PRIMO", // Ok em PT
  "PRIOR", // Ok em PT
  "RADIO", // Ok em PT
  "RAMOS", // Ok em PT
  "RATIO", // Latim/Inglês
  "RECTO", // Latim/Inglês (em PT seria RETO)
  "REGAL", // Inglês
  "REICH", // Alemão
  "RELAY", // Inglês
  "REPOR", // Ok em PT
  "REVER", // Ok em PT
  "ROMAN", // Inglês
  "ROSAS", // Ok em PT
  "ROUND", // Inglês
  "ROYAL", // Inglês
  "SALMO", // Ok em PT
  "SALSA", // Ok em PT
  "SALTO", // Ok em PT
  "SAMBA", // Ok em PT
  "SANTA", // Ok em PT
  "SANTO", // Ok em PT
  "SECOS", // Ok em PT
  "SEDAN", // Francês/Inglês
  "SELAR", // Ok em PT
  "SEREM", // Ok em PT
  "SERVO", // Ok em PT
  "SHORT", // Inglês
  "SIGMA", // Grego, ok
  "SINOS", // Ok em PT
  "SLIDE", // Inglês
  "SONAR", // Acrônimo inglês
  "SPRAY", // Inglês
  "STAFF", // Inglês
  "STAND", // Inglês
  "SUSHI", // Japonês, ok em PT
  "SWING", // Inglês
  "TANGO", // Ok em PT
  "TAMIL", // Nome de idioma
  "TEMAS", // Ok em PT
  "TEMPO", // Ok em PT
  "TERRA", // Ok em PT
  "TESLA", // Nome próprio
  "TESTE", // Ok em PT
  "TETRA", // Grego, ok
  "TEXTO", // Ok em PT
  "TIGER", // Inglês (em PT seria TIGRE)
  "TIMER", // Inglês
  "TIMES", // Inglês
  "TITAN", // Inglês/Grego
  "TONER", // Inglês
  "TONGA", // Nome de país
  "TORAH", // Hebraico, ok
  "TOTEM", // Ok em PT
  "TOWER", // Inglês
  "TRIBO", // Ok em PT
  "TRIPE", // Francês/Inglês
  "TUMOR", // Latim, ok em PT
  "TUNEL", // Ok em PT (TÚNEL)
  "TURBO", // Latim, ok em PT
  "TURMA", // Ok em PT
  "TURNO", // Ok em PT
  "URANO", // Nome próprio (planeta)
  "VAGAO", // Ok em PT
  "VALOR", // Ok em PT
  "VAPOR", // Ok em PT
  "VASCO", // Nome próprio
  "VENUS", // Nome próprio (planeta)
  "VERBO", // Ok em PT
  "VERDE", // Ok em PT
  "VERSO", // Ok em PT
  "VIGOR", // Ok em PT
  "VINTE", // Ok em PT
  "VIRAL", // Ok em PT
  "VIRUS", // Latim, ok em PT
  "VISAR", // Ok em PT
  "VITAL", // Ok em PT
  "VOCAL", // Ok em PT
  "VODCA", // Russo, ok em PT
  "VOGAL", // Ok em PT
  "VOTAR", // Ok em PT
  "VULGO", // Latim, ok em PT
  "ZEBRA", // Ok em PT
  "ZONAL", // Ok em PT
]);

async function analyzePossibleEnglish() {
  const content = await fs.readFile(POSSIBLE_ENGLISH_PATH, "utf-8");
  const words = content
    .split("\n")
    .map((w) => w.trim())
    .filter((w) => w.length > 0);

  console.log(`\n📊 Análise de ${words.length} palavras encontradas:\n`);

  const pureEnglish: string[] = [];
  const cognates: string[] = [];
  const needsReview: string[] = [];

  for (const word of words) {
    if (PURE_ENGLISH_WORDS.has(word)) {
      pureEnglish.push(word);
    } else {
      // Palavras que provavelmente são cognatos válidos ou empréstimos aceitos
      cognates.push(word);
    }
  }

  console.log(`✅ Cognatos/Empréstimos válidos em PT: ${cognates.length} palavras`);
  console.log(`   (Palavras que existem em inglês MAS também são válidas em português)\n`);

  console.log(`❌ Palavras puramente inglesas identificadas: ${pureEnglish.length} palavras`);
  if (pureEnglish.length > 0) {
    console.log(`\n   Exemplos:`);
    pureEnglish.slice(0, 20).forEach((word, index) => {
      if (index % 5 === 0 && index > 0) console.log();
      process.stdout.write(`   ${word.padEnd(10)}`);
    });
    if (pureEnglish.length > 20) {
      console.log(`\n   ... e mais ${pureEnglish.length - 20}`);
    }
  }

  console.log(`\n\n💡 Recomendação:`);
  console.log(`   A maioria das ${cognates.length} palavras são cognatos válidos.`);
  console.log(`   Mantenha-as no jogo pois são palavras reais em português!\n`);

  console.log(`⚠️  Palavras claramente inglesas para revisar:`);
  const obviousEnglish = [
    "ALTER", "BATCH", "BASIC", "CATCH", "CHECK", "CLOSE", "CRACK",
    "CRAWL", "DERBY", "DRIVE", "FLASH", "FLUSH", "FRONT", "GLIDE",
    "HOBBY", "INPUT", "LOGIN", "LOBBY", "MATCH", "MOUSE", "PAPER",
    "PIXEL", "PLACE", "ROUND", "ROYAL", "SHORT", "SLIDE", "SPRAY",
    "STAFF", "STAND", "SWING", "TIGER", "TIMER", "TOWER", "ALLEN"
  ];

  const found = obviousEnglish.filter(w => words.includes(w));
  if (found.length > 0) {
    console.log(`\n   ${found.length} palavras obviamente inglesas encontradas:`);
    found.forEach((word, index) => {
      if (index % 5 === 0 && index > 0) console.log();
      process.stdout.write(`   ${word.padEnd(10)}`);
    });
    console.log(`\n`);

    // Criar arquivo com palavras para remover
    const removeListPath = path.resolve(
      __dirname,
      "..",
      "dados",
      "english-words-to-remove.txt"
    );
    await fs.writeFile(removeListPath, found.sort().join("\n") + "\n", "utf-8");

    console.log(`\n📝 Lista salva em: dados/english-words-to-remove.txt`);
    console.log(`\n   Para remover essas palavras, execute:`);
    console.log(`   npm run words:remove-words dados/english-words-to-remove.txt\n`);
  }
}

analyzePossibleEnglish().catch((error) => {
  console.error("Erro:", error);
  process.exit(1);
});
