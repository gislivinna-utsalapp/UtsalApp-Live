// server/index.ts

import express from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import path from "path";
import fs from "fs";

const PORT = Number(process.env.PORT) || 5000;

// uploads dir (einfalt og stöðugt)
const UPLOAD_DIR =
  process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

function main() {
  // 1) Logga óhöndlaðar villur (til að missa ekki crash)
  process.on("unhandledRejection", (reason) => {
    console.error("[unhandledRejection]", reason);
  });

  process.on("uncaughtException", (err) => {
    console.error("[uncaughtException]", err);
  });

  // 2) Tryggja að uploads mappa sé til
  try {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    console.log("[uploads] dir ready:", UPLOAD_DIR);
  } catch (err) {
    console.error("[uploads] mkdir failed:", UPLOAD_DIR, err);
  }

  const app = express();

  // 3) Logga bara uploads request (til að staðfesta að request hittir appið)
  app.use((req, _res, next) => {
    if (req.method === "POST" && req.originalUrl === "/api/v1/uploads") {
      console.log("[UPLOAD REQUEST]", {
        url: req.originalUrl,
        contentType: req.headers["content-type"],
        contentLength: req.headers["content-length"],
      });
    }
    next();
  });

  // 4) Register all routes
  registerRoutes(app);

  // 5) Global error handler: þetta er “lykilinn” til að sjá rótina
  //    (þetta mun logga stack trace í Replit console)
  app.use(
    (
      err: any,
      req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      console.error("[API ERROR]", {
        url: req.originalUrl,
        method: req.method,
        message: err?.message,
        code: err?.code,
        name: err?.name,
      });
      if (err?.stack) console.error(err.stack);

      // Skilum JSON í stað HTML
      res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
    },
  );

  const server = createServer(app);

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[express] serving on port ${PORT}`);
  });
}

main();
