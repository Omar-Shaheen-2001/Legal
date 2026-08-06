import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { env } from "./config/env";

const app: Express = express();

// Trust the first proxy (Vercel edge) so that:
//   - req.secure === true  (Vercel always terminates TLS)
//   - req.ip is the real client IP (from x-forwarded-for)
//   - secure cookies are accepted by the browser even on HTTPS
app.set("trust proxy", 1);

const pinoHttpMiddleware: any = (pinoHttp as any).default || pinoHttp;

app.use(
  pinoHttpMiddleware({
    logger,
    serializers: {
      req(req: any) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res: any) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(env.sessionSecret));

import path from "path";
import fs from "fs";

// Mount API routes under /api
app.use("/api", router);

// Serve static frontend files in production / standalone server (Render)
const possibleDistPaths = [
  path.resolve(process.cwd(), "dist"),
  path.resolve(process.cwd(), "artifacts/court-session-management/dist"),
];

const distPath = possibleDistPaths.find((p) => fs.existsSync(path.join(p, "index.html")));

if (distPath) {
  logger.info(`[Server] Serving static frontend from: ${distPath}`);
  app.use(express.static(distPath));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(distPath, "index.html"));
  });
} else {
  // Fallback for API-only mode
  app.use(router);
}

export default app;

