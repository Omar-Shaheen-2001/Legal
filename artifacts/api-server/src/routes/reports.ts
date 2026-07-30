import { Router, type IRouter } from "express";
import { attachAuthUser, requireAuth } from "../middlewares/auth.middleware";
import { getSessionReport, upsertSessionReport } from "../services/session.service";
import { isGoogleSheetsConfigured } from "../config/env";
import { logger } from "../lib/logger";

const router: IRouter = Router();

/** GET /api/sessions/:id/report — fetch the saved report (null if none) */
router.get("/sessions/:id/report", attachAuthUser, requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid session id." });
    return;
  }
  if (!isGoogleSheetsConfigured()) {
    res.status(500).json({ error: "Google Sheets is not configured." });
    return;
  }
  try {
    const report = await getSessionReport(id);
    if (!report) {
      // Return 200 with null instead of 404 so the frontend can show an empty form
      res.status(200).json(null);
      return;
    }
    res.json(report);
  } catch (err) {
    logger.error({ err }, "Failed to fetch session report");
    res.status(500).json({ error: "Failed to fetch session report." });
  }
});

/** PUT /api/sessions/:id/report — create or update the report */
router.put("/sessions/:id/report", attachAuthUser, requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid session id." });
    return;
  }
  if (!isGoogleSheetsConfigured()) {
    res.status(500).json({ error: "Google Sheets is not configured." });
    return;
  }
  try {
    logger.info({ id, body: req.body }, "Saving session report...");
    const updated = await upsertSessionReport(id, req.body ?? {});
    if (!updated) {
      res.status(404).json({ error: "Session not found." });
      return;
    }
    logger.info({ id }, "Session report saved successfully");
    res.json(updated);
  } catch (err) {
    logger.error({ err }, "Failed to save session report");
    res.status(500).json({ error: "Failed to save session report." });
  }
});

export default router;
