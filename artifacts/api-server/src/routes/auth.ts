import { Router, type IRouter } from "express";
import { LoginBody, LoginResponse, GetCurrentUserResponse } from "@workspace/api-zod";
import { env, isAuthConfigured } from "../config/env";
import { logger } from "../lib/logger";
import {
  attachAuthUser,
  clearSessionCookie,
  requireAuth,
  setSessionCookie,
} from "../middlewares/auth.middleware";

const router: IRouter = Router();

router.post("/auth/login", attachAuthUser, (req, res) => {
  if (!isAuthConfigured()) {
    res.status(500).json({
      error: "Login is not configured yet. Set APP_USERNAME and APP_PASSWORD.",
    });
    return;
  }

  const parseResult = LoginBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "Username and password are required." });
    return;
  }

  const { username, password } = parseResult.data;
  if (username !== env.appUsername || password !== env.appPassword) {
    res.status(401).json({ error: "Invalid username or password." });
    return;
  }

  setSessionCookie(res, username);
  const data = LoginResponse.parse({ username });
  res.json(data);
});

router.post("/auth/logout", (_req, res) => {
  clearSessionCookie(res);
  res.status(204).send();
});

router.get("/auth/me", attachAuthUser, requireAuth, (req, res) => {
  try {
    const data = GetCurrentUserResponse.parse({ username: req.authUser!.username });
    res.json(data);
  } catch (err) {
    logger.error({ err }, "Failed to serialize current user");
    res.status(500).json({ error: "Failed to load current user." });
  }
});

export default router;
export { attachAuthUser, requireAuth };
