import { Router, type IRouter } from "express";
import { GetDashboardStatsResponse } from "@workspace/api-zod";
import { getDashboardStats } from "../services/session.service";
import { isGoogleSheetsConfigured } from "../config/env";
import { logger } from "../lib/logger";
import { attachAuthUser, requireAuth } from "../middlewares/auth.middleware";

const router: IRouter = Router();

router.get("/dashboard/stats", attachAuthUser, requireAuth, async (_req, res) => {
  if (!isGoogleSheetsConfigured()) {
    res.status(500).json({
      error:
        "Google Sheets is not configured yet. Set GOOGLE_SPREADSHEET_ID and GOOGLE_SERVICE_ACCOUNT_JSON.",
    });
    return;
  }
  try {
    const stats = await getDashboardStats();
    const data = GetDashboardStatsResponse.parse(stats);
    res.json(data);
  } catch (err) {
    logger.error({ err }, "Failed to load dashboard stats");
    res.status(500).json({ error: "Failed to load dashboard stats." });
  }
});

export default router;
