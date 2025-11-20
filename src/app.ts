import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import routes from "./routes";

const app = express();

// Middlewares
app.use(helmet());
app.use(compression());
app.use(express.json());

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://projeto-front-rho.vercel.app",
      "https://words-game-five.vercel.app",
    ],
    credentials: true, // Permite envio de headers de autorização
  }),
);

app.use(rateLimit({ windowMs: 60_000, max: 100 }));

// Routes
app.use(routes);

export default app;
