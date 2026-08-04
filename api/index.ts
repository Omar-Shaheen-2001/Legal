import type { IncomingMessage, ServerResponse } from "node:http";
import app from "../artifacts/api-server/src/app";

/**
 * Vercel Serverless Function handler for ALL /api/* routes.
 *
 * This file is compiled by esbuild (during `pnpm run build`) into
 * api/index.js — a self-contained CJS bundle that Vercel discovers and
 * invokes as a serverless function.
 *
 * Why CJS? Vercel's Node.js runtime requires CommonJS for function bundles
 * unless the package.json in the function directory sets "type":"module".
 *
 * Why bundle? api/index.ts imports deep TypeScript source that Vercel cannot
 * compile on its own, so we pre-bundle everything with esbuild.
 */
module.exports = function handler(req: IncomingMessage, res: ServerResponse) {
  // Vercel always terminates TLS at the edge; signal this to Express so
  // that signed secure cookies are accepted correctly.
  (req as any).headers["x-forwarded-proto"] = "https";
  return (app as any)(req, res);
};
