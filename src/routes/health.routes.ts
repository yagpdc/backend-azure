import { Router } from "express";
import { HealthController } from "../controllers/health.controller";

const router = Router();
const controller = new HealthController();

// Apenas rotas relacionadas a health checks
router.get("/", controller.health); // GET /health
router.get("/db", controller.healthDb); // GET /health/db

export default router;
