import mongoose from "mongoose";
import { WordsInfiniteRunModel } from "../src/models/words-infinite-run";
import "dotenv/config";

async function updateMaxAttempts() {
  try {
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/wordsdb";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    const activeRuns = await WordsInfiniteRunModel.find({ status: "active" });
    console.log(`Found ${activeRuns.length} active runs`);

    if (activeRuns.length > 0) {
      const result = await WordsInfiniteRunModel.updateMany(
        { status: "active" },
        { $set: { maxAttempts: 5 } }
      );
      console.log(`Updated ${result.modifiedCount} runs to maxAttempts: 5`);
    } else {
      console.log("No active runs to update");
    }

    await mongoose.disconnect();
    console.log("Done!");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

updateMaxAttempts();
