import { Router } from "express";
import { CardsController } from "../controllers/cards.controller";

const router = Router();
const controller = new CardsController();

// Rotas de consulta das cartas fixas em memória
router.get("/", controller.list); // Listar todas as 53 cartas
router.get("/:id", controller.findById); // Buscar carta por ID (0-52)

export default router;
