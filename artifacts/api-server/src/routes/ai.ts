import { Router, type IRouter } from "express";
import { AnalyzeMessageBody, AnalyzeMessageResponse } from "@workspace/api-zod";
import { analyzeCourtMessage, AiExtractionError } from "../services/ai.service";
import { logger } from "../lib/logger";
import { attachAuthUser, requireAuth } from "../middlewares/auth.middleware";

import { getSettings } from "../config/settings-store";

const router: IRouter = Router();

router.post("/ai/analyze", attachAuthUser, requireAuth, async (req, res) => {
  const settings = getSettings();
  const token = settings.hfApiToken;
  if (!token) {
    res.status(500).json({
      error: "Hugging Face Access Token is not configured. Please set it in Settings.",
    });
    return;
  }

  const parseResult = AnalyzeMessageBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "A non-empty message is required." });
    return;
  }

  try {
    const extraction = await analyzeCourtMessage(parseResult.data.message);
    const data = AnalyzeMessageResponse.parse(extraction);
    res.json(data);
  } catch (err) {
    if (err instanceof AiExtractionError) {
      res.status(502).json({ error: err.message });
      return;
    }
    logger.error({ err }, "Unexpected error during AI extraction");
    res.status(500).json({ error: "Failed to analyze the message." });
  }
});

export default router;
