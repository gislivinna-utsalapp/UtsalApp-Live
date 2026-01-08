// server/index.ts
import express from "express";
import { createServer } from "http";
import path from "path";
import fs from "fs";
import { registerRoutes } from "./routes";

const PORT = Number(process.env.PORT) || 5000;

// Uploads dir (stöðugt bæði local + Render)
const UPLOAD_DIR =
  process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

function main() {
  /**
   * 1) Global process error logging
   */
  process.on("unhandledRejection", (reason) => {
    console.error("[unhandledRejection]", reason);
  });

  process.on("uncaughtException", (err) => {
    console.error("[uncaughtException]", err);
  });

  /**
   * 2) Tryggja að uploads mappa sé til
   */
  try {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    console.log("[uploads] dir ready:", UPLOAD_DIR);
  } catch (err) {
    console.error("[uploads] mkdir failed:", UPLOAD_DIR, err);
  }

  const app = express();

  /**
   * 3) Body parsers
   */
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  /**
   * 4) STATIC SERVING – KRÍTÍSKT
   * Þetta gerir /uploads/... aðgengilegt yfir HTTP
   */
  app.use(
    "/uploads",
    express.static(UPLOAD_DIR, {
      fallthrough: false,
      index: false,
      maxAge: "7d",
    }),
  );

  console.log("[static] serving /uploads from:", UPLOAD_DIR);

  /**
   * 5) Upload request logger (debug)
   */
  app.use((req, _res, next) => {
    if (req.method === "POST" && req.originalUrl.startsWith("/api")) {
      if (req.headers["content-type"]?.includes("multipart/form-data")) {
        console.log("[UPLOAD REQUEST]", {
          url: req.originalUrl,
          contentType: req.headers["content-type"],
          contentLength: req.headers["content-length"],
        });
      }
    }
    next();
  });

  /**
   * 6) API routes
   */
  registerRoutes(app, "/api");

  /**
   * 7) Global API error handler
   * Skilar alltaf JSON (aldrei HTML)
   */
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

      if (err?.stack) {
        console.error(err.stack);
      }

      res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
    },
  );

  /**
   * 8) Start server
   */
  const server = createServer(app);

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[express] serving on port ${PORT}`);
  });
}

main();
