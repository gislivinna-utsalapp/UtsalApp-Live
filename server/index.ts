// server/index.ts

import express from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";

const PORT = Number(process.env.PORT) || 5000;

function main() {
  // Búum til Express app
  const app = express();

  // Skráum allar API-rásir og middleware á app (registerRoutes SKILAR EKKI server)
  registerRoutes(app);

  // Búum til HTTP server ofan á app
  const server = createServer(app);

  // Ræsum serverinn – MIKILVÆGT: hlusta á 0.0.0.0 fyrir Replit deploy
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[express] serving on port ${PORT}`);
  });
}

main();
