import { Router } from "express";
import { GamesController } from "../controllers/games.controller";

const router = Router();
const controller = new GamesController();

router.post("/", controller.create);
router.get("/", controller.list);

export default router;
