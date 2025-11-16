import "dotenv/config";

import { connectDb, closeDb } from "../src/mongo";
import { WordsUserModel } from "../src/models/words-user";
import { WordsUserPuzzleModel } from "../src/models/words-user-puzzle";

async function main() {
  console.log("Conectando ao MongoDB para resetar progresso...");
  await connectDb();

  const [usersResult, puzzlesResult] = await Promise.all([
    WordsUserModel.updateMany({}, { $set: { streak: 0, score: 0 } }),
    WordsUserPuzzleModel.deleteMany({}),
  ]);

  const { matchedCount, modifiedCount, n, nModified } =
    usersResult as unknown as {
      matchedCount?: number;
      modifiedCount?: number;
      n?: number;
      nModified?: number;
    };

  const totalUsers = matchedCount ?? n ?? 0;
  const updatedUsers = modifiedCount ?? nModified ?? 0;

  console.log(
    `Usuários afetados: ${totalUsers}. Streak/pontuação zeradas em ${updatedUsers}.`,
  );
  console.log(
    `Entradas de histórico removidas: ${puzzlesResult.deletedCount ?? 0}.`,
  );
}

main()
  .catch((error) => {
    console.error("Falha ao resetar progresso:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
