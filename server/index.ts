// server/index.ts
import express from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";

const PORT = Number(process.env.PORT) || 5000;

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

  const app = express();

  /**
   * 2) Body parsers
   */
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  /**
   * 3) API routes
   * ⚠️ ALL upload / static / uploads logic lives INSIDE routes.ts
   */
  registerRoutes(app, "/api");

  /**
   * 4) Global API error handler
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
   * 5) Start server
   */
  const server = createServer(app);

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[express] serving on port ${PORT}`);
  });
}

main();
