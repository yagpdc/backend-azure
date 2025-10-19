import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { getDb } from "./mongo";

const app = express();

app.use(helmet());
app.use(compression());
app.use(express.json());

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://projeto-front-rho.vercel.app",
    ],
    credentials: false,
  })
);

app.use(rateLimit({ windowMs: 60_000, max: 100 }));
app.get("/", (_req, res) => res.send("Yago santana backend is running!"));
app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/teste", (_req, res) => res.json({ message: "Resposta da API" }));

// exemplo com id
app.get("/add/:num1/:num2", (req, res) => {
  const num1 = req.params.num1;
  const num2 = req.params.num2;
  const sum = Number(num1) + Number(num2);
  res.json({ num1, num2, sum, message: "Soma realizada com sucesso!" });
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
const createUserDto = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});
app.post("/users", async (req, res) => {
  const parse = createUserDto.safeParse(req.body);
  if (!parse.success)
    return res.status(400).json({ error: parse.error.flatten() });

  const db = await getDb();
  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  const result = await db.collection("users").insertOne({
    ...parse.data,
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
app.listen(port, () =>
  console.log(`Server running on http://localhost:${port}`)
);
