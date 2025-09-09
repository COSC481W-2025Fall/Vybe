import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// --- DEBUG: show which file is running
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log("Running server.js from:", __filename);

// --- DEBUG: log every request
app.use((req, res, next) => {
  console.log("REQ", req.method, req.url);
  next();
});

// Root
app.get("/", (req, res) => {
  res.json({ ok: true, message: "Vybe API is running" });
});

// Health check used by the frontend
app.get("/api/ping", (req, res) => {
  res.json({ pong: true });
});

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`API on http://localhost:${PORT}`);
});
