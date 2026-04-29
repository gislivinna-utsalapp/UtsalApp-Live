// server/index.ts
import express from "express";
import { createServer } from "http";
import path from "path";
import fs from "fs";
import session from "express-session";

import { registerRoutes } from "./routes";
import { UPLOAD_DIR } from "./config/uploads";
import { sessionTracker, initDb } from "./session-tracker";
import { seedDatabaseIfEmpty } from "./seed-db";

const PORT = Number(process.env.PORT) || 5000;

async function main() {
  /**
   * 1) Global process error logging
   */
  process.on("unhandledRejection", (reason) => {
    console.error("[unhandledRejection]", reason);
  });

  process.on("uncaughtException", (err) => {
    console.error("[uncaughtException]", err);
  });

  // Create analytics table if it doesn't exist (safe on every startup)
  await initDb();

  // Seed database with initial data if it is empty (first deploy on Render)
  await seedDatabaseIfEmpty();

  const app = express();

  // IMPORTANT: Replit/proxy environments
  app.set("trust proxy", 1);

  /**
   * ✅ Session middleware (MUST be before routes)
   */
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "utsalapp-dev-session-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: false, // keep false for now on Replit
      },
    }),
  );

  /**
   * 2) Session tracker — assigns a persistent UUID cookie to every visitor
   *    and logs API requests into the in-memory interaction store.
   *    Must be registered before routes so req.sessionId is always available.
   */
  app.use(sessionTracker);

  /**
   * 3) SERVE UPLOADS (GLOBAL, BEFORE EVERYTHING)
   */
  console.log("[uploads] UPLOAD_DIR =", UPLOAD_DIR);
  try {
    if (fs.existsSync(UPLOAD_DIR)) {
      console.log(
        "[uploads] files on disk:",
        fs.readdirSync(UPLOAD_DIR).slice(0, 10),
      );
    } else {
      console.warn("[uploads] directory does NOT exist");
    }
  } catch (err) {
    console.error("[uploads] error reading upload dir", err);
  }

  app.use(
    "/uploads",
    express.static(UPLOAD_DIR, {
      maxAge: "30d",
      immutable: true,
    }),
  );

  /**
   * 3) Body parsers
   */
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  /**
   * 4) API routes
   */
  registerRoutes(app, "/api");

  /**
   * 5) Global API error handler
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
   * 6) Start server
   */
  const server = createServer(app);

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[express] serving on port ${PORT}`);
  });
}

main();
