import { Router } from "express";
import { CardsController } from "../controllers/cards.controller";

const router = Router();
const controller = new CardsController();

// Rotas do jogo (antes das rotas com :id)
router.post("/game/start", controller.startGame); // Criar deck do jogo
router.delete("/game/clear", controller.clearGame); // Limpar todas as cartas

// CRUD de cards
router.post("/", controller.create);
router.get("/", controller.list);
router.get("/:id", controller.findById);
router.put("/:id", controller.update);
router.delete("/:id", controller.delete);
export default router;
