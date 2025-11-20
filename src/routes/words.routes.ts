import { Router } from "express";
import { WordsController } from "../controllers/words.controller";
import { wordsInfiniteCoopController } from "../controllers/words-infinite-coop.controller";
import { wordsAuth } from "../middlewares/words-auth.middleware";

const router = Router();
const controller = new WordsController();

router.use(wordsAuth);

router.get("/profile", controller.getProfile);
router.put("/profile/avatar", controller.updateAvatar);
router.get("/history", controller.getHistory);
router.post("/history", controller.createHistoryEntry);
router.get("/avatar/options", controller.listAvatarOptions);

router.get("/puzzles/daily", controller.getDailyPuzzle);
router.post("/puzzles/daily/guess", controller.submitDailyGuess);
router.get("/puzzles", controller.listPuzzles);
router.post("/puzzles", controller.createPuzzle);
router.get("/infinite/random", controller.getInfiniteRandomWord);
router.get("/infinite/words", controller.listInfiniteWords);

// Rotas modo solo
router.post("/infinite/run", controller.startInfiniteRun);
router.get("/infinite/run", controller.getInfiniteRunStatus);
router.post("/infinite/run/guess", controller.submitInfiniteGuess);
router.post("/infinite/run/abandon", controller.abandonInfiniteRun);

// Rotas modo co-op
router.get("/infinity/coop/my-room", wordsInfiniteCoopController.getMyRoom.bind(wordsInfiniteCoopController));
router.post("/infinity/coop/create-room", wordsInfiniteCoopController.createRoom.bind(wordsInfiniteCoopController));
router.post("/infinity/coop/join-room/:roomId", wordsInfiniteCoopController.joinRoom.bind(wordsInfiniteCoopController));
router.get("/infinity/coop/room/:roomId", wordsInfiniteCoopController.getRoom.bind(wordsInfiniteCoopController));
router.post("/infinity/coop/guess", wordsInfiniteCoopController.submitGuess.bind(wordsInfiniteCoopController));
router.post("/infinity/coop/abandon", wordsInfiniteCoopController.abandonRun.bind(wordsInfiniteCoopController));
router.post("/infinity/coop/leave-room", wordsInfiniteCoopController.leaveRoom.bind(wordsInfiniteCoopController));
router.post("/infinity/coop/force-leave", wordsInfiniteCoopController.forceLeave.bind(wordsInfiniteCoopController));

router.get("/ranking", controller.getRanking);

export default router;
