import { Router } from "express";
import healthRoutes from "./health.routes";
import gamesRoutes from "./games.routes";
import cardsRoutes from "./cards.routes";
import { HealthController } from "../controllers/health.controller";

const router = Router();

// Rota raiz (/)
const healthController = new HealthController();
router.get("/", healthController.root);

// Rotas organizadas por prefixo
router.use("/health", healthRoutes); // /health e /health/db
router.use("/games", gamesRoutes);
router.use("/cards", cardsRoutes); // /cards

export default router;
