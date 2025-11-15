import "dotenv/config";
import { connectDb, closeDb } from "../src/mongo";
import { WordsUserModel } from "../src/models/words-user";

const DEFAULT_NAME = process.env.WORDS_ADMIN_USER ?? "admin";

async function main() {
  const name = process.argv[2] ?? DEFAULT_NAME;
  if (!name) {
    throw new Error(
      "Informe um nome padrão via WORDS_ADMIN_USER ou como argumento do script.",
    );
  }

  await connectDb();

  const existing = await WordsUserModel.findOne({ name });
  if (existing) {
    console.log(
      `Usuário '${name}' já existe com id ${existing.id}. Nenhuma alteração feita.`,
    );
    return;
  }

  const user = await WordsUserModel.create({
    name,
    streak: 0,
    score: 0,
    config: {},
  });

  console.log(`Usuário '${name}' criado com id ${user.id}.`);
}

main()
  .catch((error) => {
    console.error("Falha ao garantir usuário Words:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
