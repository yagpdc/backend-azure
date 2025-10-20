"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_1 = __importDefault(require("./app"));
const mongo_1 = require("./mongo");
const port = Number(process.env.PORT) || 3000;
// Conectar ao MongoDB antes de iniciar o servidor
(0, mongo_1.connectDb)()
    .then(() => {
    app_1.default.listen(port, () => console.log(`🚀 Server running on http://localhost:${port}`));
})
    .catch((error) => {
    console.error("❌ Falha ao iniciar servidor:", error);
    process.exit(1);
});
