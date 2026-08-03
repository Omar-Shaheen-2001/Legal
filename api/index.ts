import app from "../artifacts/api-server/src/app";

/**
 * Vercel Serverless handler for all /api/* routes.
 *
 * When Vercel rewrites /api/ai/analyze → /api/index, it sets:
 *   req.url        = "/api/index"          (the rewrite destination)
 *   x-matched-path = "/api/ai/analyze"     (the actual path the user requested)
 *
 * We restore req.url from x-matched-path so Express sees the correct path
 * (e.g. /api/ai/analyze) instead of the rewritten /api/index.
 *
 * Trust Vercel proxy headers so that:
 *   - req.ip is the real client IP
 *   - req.secure is true (Vercel always serves over HTTPS)
 *   - Signed cookies whose "secure" flag is set still work
 */
export default function handler(req: any, res: any) {
  // Restore original path that was rewritten by Vercel
  const matchedPath = req.headers["x-matched-path"];
  if (typeof matchedPath === "string" && matchedPath) {
    req.url = matchedPath;
  }

  // Mark request as coming through a trusted proxy (Vercel) so
  // Express treats it as HTTPS and forwards the real IP.
  req.headers["x-forwarded-proto"] = "https";

  return app(req, res);
}
