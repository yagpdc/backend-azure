import { Router } from "express";
import { DecksController } from "../controllers/decks.controller";

const router = Router();
const controller = new DecksController();

// Rota de limpar antes das rotas com :id
router.delete("/clear", controller.clearAll);

// CRUD básico
router.post("/", controller.create);
router.get("/", controller.list);
router.get("/:id", controller.findById);
router.put("/:id", controller.update);
router.delete("/:id", controller.delete);

// Ação específica: comprar carta
router.post("/:id/draw", controller.drawCard);

export default router;
