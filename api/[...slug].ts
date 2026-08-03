import app from "../artifacts/api-server/src/app";

/**
 * Vercel catch-all handler for /api/* routes.
 *
 * By naming this file [...slug].ts, Vercel's file-based routing routes
 * ALL /api/* requests here natively (no rewrites needed), and crucially
 * req.url is set to the ORIGINAL request path (e.g. /api/settings),
 * not the function file path. This lets Express route correctly.
 */
export default function handler(req: any, res: any) {
  // Vercel always serves over HTTPS – signal this to Express so
  // that signed secure cookies are accepted correctly.
  req.headers["x-forwarded-proto"] = "https";
  return app(req, res);
}
