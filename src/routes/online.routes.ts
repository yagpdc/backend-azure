import { Router } from "express";
import { OnlineController } from "../controllers/online.controller";

const router = Router();
const controller = new OnlineController();

// GET /online - Lista de usuários online
router.get("/", controller.getOnlineUsers);

// POST /online - Marcar usuário como online (temporário, para debug)
router.post("/", controller.markUserOnline);

export default router;
