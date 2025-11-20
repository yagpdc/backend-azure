import "dotenv/config";
import { connectDb } from "../src/mongo";
import { WordsInfiniteRoomModel } from "../src/models/words-infinite-room";
import { WordsInfiniteRunModel } from "../src/models/words-infinite-run";

async function cleanupRooms() {
  await connectDb();

  try {
    console.log("🧹 Limpando salas e runs...\n");

    // Deletar todas as salas
    const roomsDeleted = await WordsInfiniteRoomModel.deleteMany({});
    console.log(`✅ ${roomsDeleted.deletedCount} salas deletadas`);

    // Deletar todas as runs
    const runsDeleted = await WordsInfiniteRunModel.deleteMany({});
    console.log(`✅ ${runsDeleted.deletedCount} runs deletadas`);

    console.log("\n✨ Banco limpo! Todos os jogadores foram liberados das salas.\n");

  } catch (error) {
    console.error("❌ Erro ao limpar banco:", error);
  }

  process.exit(0);
}

cleanupRooms();
