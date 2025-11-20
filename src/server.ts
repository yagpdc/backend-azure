import "dotenv/config";
import { createServer } from "http";
import app from "./app";
import { connectDb } from "./mongo";
import { setupSocketIO } from "./services/online-users.service";

const port = Number(process.env.PORT) || 3000;

// Criar servidor HTTP para usar com Socket.IO
const httpServer = createServer(app);

// Configurar Socket.IO
const io = setupSocketIO(httpServer);

// Tornar io acessível globalmente (opcional, para emitir eventos de outros lugares)
app.set("io", io);

connectDb()
  .then(() => {
    httpServer.listen(port, () => {
      console.log(`🚀 Server running on http://localhost:${port}`);
      console.log(`🔌 Socket.IO ready for connections`);
    });
  })
  .catch((error) => {
    console.error("❌ Falha ao iniciar servidor:", error);
    process.exit(1);
  });
