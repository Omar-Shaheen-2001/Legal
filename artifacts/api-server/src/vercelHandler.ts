import type { IncomingMessage, ServerResponse } from "node:http";
import app from "./app";

/**
 * Vercel Serverless Function entrypoint.
 * Bundled into api/index.js and api/[...path].js by build.mjs.
 */
export default function handler(req: IncomingMessage, res: ServerResponse) {
  // Vercel terminates TLS at the edge; signal this to Express
  (req as any).headers["x-forwarded-proto"] = "https";
  return (app as any)(req, res);
}
