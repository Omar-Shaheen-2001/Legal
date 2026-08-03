import app from "../artifacts/api-server/src/app";

export default function handler(req: any, res: any) {
  if (req.url === "/api/index" || req.url === "/api/index/") {
    const originalUrl =
      req.headers["x-forwarded-uri"] || req.headers["x-matched-path"];
    if (typeof originalUrl === "string" && originalUrl) {
      req.url = originalUrl;
    }
  }
  return app(req, res);
}
