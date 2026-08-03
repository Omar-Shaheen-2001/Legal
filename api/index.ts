import app from "../artifacts/api-server/src/app";

/**
 * Vercel Serverless handler for all /api/* routes.
 *
 * Vercel preserves the original req.url through rewrites, so we do NOT
 * need to manipulate it. We only need to:
 *  - Mark the request as HTTPS (Vercel always terminates TLS at the edge)
 *    so that Express treats req.secure = true and secure cookies work.
 */
export default function handler(req: any, res: any) {
  // Vercel always serves over HTTPS – let Express know so signed
  // secure cookies are read correctly.
  req.headers["x-forwarded-proto"] = "https";
  return app(req, res);
}
