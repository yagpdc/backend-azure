import { connectDb } from "../src/mongo";
import { WordsUsersService } from "../src/services/words-users.service";
import { WordsCredentialService } from "../src/services/words-credentials.service";

async function createTestUser() {
  await connectDb();

  const usersService = new WordsUsersService();
  const credentialService = new WordsCredentialService();

  try {
    // Criar usuário Player2
    const player2 = await usersService.findByName("Player2");

    if (player2) {
      console.log("✅ Usuário Player2 já existe!");
      console.log("ID:", player2.id);
      console.log("Username:", player2.username);
    } else {
      const newUser = await usersService.create({
        username: "Player2",
        config: {
          avatar: {
            skin: "default",
            hair: "short",
            shirt: "blue",
          }
        }
      });

      console.log("✅ Usuário Player2 criado com sucesso!");
      console.log("ID:", newUser.id);
      console.log("Username:", newUser.username);
    }

    // Mostrar credenciais
    console.log("\n📋 CREDENCIAIS PARA TESTAR:\n");
    console.log("Jogador 1:");
    console.log("  Username: (seu usuário atual)");
    console.log("  Password: (sua senha atual)");
    console.log("\nJogador 2:");
    console.log("  Username: Player2");
    console.log("  Password: (use a mesma senha configurada no .env)");
    console.log("\n💡 Como usar:");
    console.log("1. Aba Normal: Login com Jogador 1");
    console.log("2. Aba Anônima: Login com Player2");
    console.log("3. Jogador 1 cria sala e compartilha código");
    console.log("4. Jogador 2 entra com o código\n");

  } catch (error) {
    console.error("❌ Erro ao criar usuário:", error);
  }

  process.exit(0);
}

createTestUser();
