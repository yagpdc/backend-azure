import "dotenv/config";
import express from "express";
import { getDb, closeDb } from "./mongo";

const app = express();
app.use(express.json());

app.get("/", (_req, res) => {
  res.send("Yago santana backend is running!");
});

app.get("/health/db", async (_req, res) => {
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message });
  }
});

app.post("/users", async (req, res) => {
  const db = await getDb();
  const result = await db.collection("users").insertOne({
    name: req.body.name,
    email: req.body.email,
    createdAt: new Date(),
  });
  res.status(201).json({ id: result.insertedId });
});

app.get("/users", async (_req, res) => {
  const db = await getDb();
  const users = await db.collection("users").find().limit(50).toArray();
  res.json(users);
});

const port = Number(process.env.PORT) || 3000;
const server = app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

process.on("SIGINT", async () => {
  await closeDb();
  server.close(() => process.exit(0));
});
process.on("SIGTERM", async () => {
  await closeDb();
  server.close(() => process.exit(0));
});
