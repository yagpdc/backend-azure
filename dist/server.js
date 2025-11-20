"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const http_1 = require("http");
const app_1 = __importDefault(require("./app"));
const mongo_1 = require("./mongo");
const online_users_service_1 = require("./services/online-users.service");
const port = Number(process.env.PORT) || 3000;
// Criar servidor HTTP para usar com Socket.IO
const httpServer = (0, http_1.createServer)(app_1.default);
// Configurar Socket.IO
const io = (0, online_users_service_1.setupSocketIO)(httpServer);
// Tornar io acessível globalmente (opcional, para emitir eventos de outros lugares)
app_1.default.set("io", io);
(0, mongo_1.connectDb)()
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
