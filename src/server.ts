import express from "express";

const app = express();
app.use(express.json());

app.get("/", (_req, res) => {
  res.send("OK");
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
