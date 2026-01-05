// server/index.ts
import express from "express";
import { createServer } from "http";
import cors from "cors";
import path from "path";
import { registerRoutes } from "./routes";

const app = express();
const httpServer = createServer(app);

// 1) Leyfa CORS
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2) API routes
registerRoutes(app);

// 3) Heimasíða route
app.get("/", (req, res) => {
  res.send("✅ ÚtsalApp backend keyrir!");
});

// 4) Serve frontend (ef build til er)
const clientDist = path.join(process.cwd(), "client", "dist");
app.use(express.static(clientDist));

// 5) Allt annað sendum við index.html (SPA routing)
app.get("*", (req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

// 6) Starta server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server keyrir á port ${PORT}`);
});
