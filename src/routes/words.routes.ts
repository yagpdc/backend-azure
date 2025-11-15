import { Router } from "express";
import { WordsController } from "../controllers/words.controller";
import { wordsAuth } from "../middlewares/words-auth.middleware";

const router = Router();
const controller = new WordsController();

router.use(wordsAuth);

router.get("/profile", controller.getProfile);
router.get("/history", controller.getHistory);
router.post("/history", controller.createHistoryEntry);

router.get("/puzzles/daily", controller.getDailyPuzzle);
router.post("/puzzles/daily/guess", controller.submitDailyGuess);
router.get("/puzzles", controller.listPuzzles);
router.post("/puzzles", controller.createPuzzle);
router.get("/infinite/random", controller.getInfiniteRandomWord);
router.get("/infinite/words", controller.listInfiniteWords);
router.get("/ranking", controller.getRanking);

export default router;
