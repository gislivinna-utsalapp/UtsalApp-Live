import express from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";

const PORT = Number(process.env.PORT) || 5000;

function main() {
  const app = express();
  registerRoutes(app);

  const server = createServer(app);

  server.listen(PORT, "0.0.0.0", () => {
    // ✅ LAGFÆRT: template-string
    console.log(`[express] serving on port ${PORT}`);
  });
}

main();
