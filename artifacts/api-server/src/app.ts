import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import router from "./routes";
import { logger } from "./lib/logger";
import { env } from "./config/env";

// ESM-safe __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Express = express();

// Trust the first proxy (Render/Vercel edge)
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

// Mount API routes under /api
app.use("/api", router);

// Serve static frontend files in production / standalone server (Render)
const possibleDistPaths = [
  path.resolve(process.cwd(), "dist"),
  path.resolve(process.cwd(), "artifacts/court-session-management/dist"),
  path.resolve(__dirname, "../../court-session-management/dist"),
  path.resolve(__dirname, "../dist"),
  path.resolve(__dirname, "../../dist"),
];

const distPath = possibleDistPaths.find((p) => {
  try {
    return fs.existsSync(path.join(p, "index.html"));
  } catch {
    return false;
  }
});

if (distPath) {
  logger.info(`[Server] Serving static frontend from: ${distPath}`);
  app.use(express.static(distPath));
  // SPA fallback — return index.html for all non-API routes
  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(distPath, "index.html"));
  });
} else {
  logger.warn("[Server] No dist/index.html found — frontend will not be served.");
  // Still mount router as fallback for API-only debugging
  app.use(router);
}

export default app;
