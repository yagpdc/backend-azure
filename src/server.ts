import "dotenv/config";
import app from "./app";
import { connectDb } from "./mongo";

const port = Number(process.env.PORT) || 3000;

connectDb()
  .then(() => {
    app.listen(port, () =>
      console.log(`🚀 Server running on http://localhost:${port}`),
    );
  })
  .catch((error) => {
    console.error("❌ Falha ao iniciar servidor:", error);
    process.exit(1);
  });
