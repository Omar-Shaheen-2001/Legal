import { Router, type IRouter } from "express";
import {
  CreateSessionBody,
  CreateSessionResponse,
  ListSessionsQueryParams,
  ListSessionsResponse,
  UpdateSessionBody,
  UpdateSessionResponse,
  GetSessionResponse,
} from "@workspace/api-zod";
import {
  createSession,
  deleteSession,
  getSessionById,
  listSessions,
  updateSession,
} from "../services/session.service";
import { isGoogleSheetsConfigured } from "../config/env";
import { logger } from "../lib/logger";
import { attachAuthUser, requireAuth } from "../middlewares/auth.middleware";

const router: IRouter = Router();

function unconfiguredResponse(): { error: string } {
  return {
    error:
      "Google Sheets is not configured yet. Set GOOGLE_SPREADSHEET_ID and GOOGLE_SERVICE_ACCOUNT_JSON.",
  };
}

router.get("/sessions", attachAuthUser, requireAuth, async (req, res) => {
  if (!isGoogleSheetsConfigured()) {
    res.status(500).json(unconfiguredResponse());
    return;
  }
  const parseResult = ListSessionsQueryParams.safeParse(req.query);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid status filter." });
    return;
  }
  try {
    const sessions = await listSessions(parseResult.data.status);
    const data = ListSessionsResponse.parse(sessions);
    res.json(data);
  } catch (err) {
    logger.error({ err }, "Failed to list sessions");
    res.status(500).json({ error: "Failed to load sessions." });
  }
});

router.post("/sessions", attachAuthUser, requireAuth, async (req, res) => {
  if (!isGoogleSheetsConfigured()) {
    res.status(500).json(unconfiguredResponse());
    return;
  }
  const parseResult = CreateSessionBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid session data." });
    return;
  }
  try {
    const session = await createSession(parseResult.data);
    const data = CreateSessionResponse.parse(session);
    res.status(201).json(data);
  } catch (err) {
    logger.error({ err }, "Failed to create session");
    res.status(500).json({ error: "Failed to create session." });
  }
});

router.get("/sessions/:id", attachAuthUser, requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid session id." });
    return;
  }
  if (!isGoogleSheetsConfigured()) {
    res.status(500).json(unconfiguredResponse());
    return;
  }
  try {
    const session = await getSessionById(id);
    if (!session) {
      res.status(404).json({ error: "Session not found." });
      return;
    }
    const data = GetSessionResponse.parse(session);
    res.json(data);
  } catch (err) {
    logger.error({ err }, "Failed to load session");
    res.status(500).json({ error: "Failed to load session." });
  }
});

router.patch("/sessions/:id", attachAuthUser, requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid session id." });
    return;
  }
  if (!isGoogleSheetsConfigured()) {
    res.status(500).json(unconfiguredResponse());
    return;
  }
  const parseResult = UpdateSessionBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid session data." });
    return;
  }
  try {
    const session = await updateSession(id, parseResult.data);
    if (!session) {
      res.status(404).json({ error: "Session not found." });
      return;
    }
    const data = UpdateSessionResponse.parse(session);
    res.json(data);
  } catch (err) {
    logger.error({ err }, "Failed to update session");
    res.status(500).json({ error: "Failed to update session." });
  }
});

router.delete("/sessions/:id", attachAuthUser, requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid session id." });
    return;
  }
  if (!isGoogleSheetsConfigured()) {
    res.status(500).json(unconfiguredResponse());
    return;
  }
  try {
    const deleted = await deleteSession(id);
    if (!deleted) {
      res.status(404).json({ error: "Session not found." });
      return;
    }
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Failed to delete session");
    res.status(500).json({ error: "Failed to delete session." });
  }
});

export default router;
