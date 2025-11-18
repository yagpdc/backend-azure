import "dotenv/config";
import mongoose from "mongoose";
import { WordsUserModel } from "../src/models/words-user";

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("MONGODB_URI is not configured");
  }

  const [, , identifier = "chaoky", rawDelta] = process.argv;
  const delta = rawDelta ? Number(rawDelta) : -999;
  if (!Number.isFinite(delta) || delta === 0) {
    throw new Error("The delta argument must be a non-zero number");
  }

  await mongoose.connect(mongoUri);

  let user;
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    user = await WordsUserModel.findById(identifier);
  }
  if (!user) {
    user = await WordsUserModel.findOne({
      name: new RegExp(`^${identifier}$`, "i"),
    });
  }
  if (!user) {
    throw new Error(`Words user "${identifier}" not found`);
  }

  const currentScore = user.score ?? 0;
  const newScore = Math.max(0, currentScore + delta);
  user.score = newScore;
  await user.save();

  console.log(
    `Updated ${user.name} score: ${currentScore} -> ${newScore} (delta ${delta})`,
  );

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
