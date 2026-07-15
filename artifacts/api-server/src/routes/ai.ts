import { Router, type IRouter } from "express";
import { AnalyzeMessageBody, AnalyzeMessageResponse } from "@workspace/api-zod";
import { analyzeCourtMessage, AiExtractionError } from "../services/ai.service";
import { isAiConfigured } from "../config/env";
import { logger } from "../lib/logger";
import { attachAuthUser, requireAuth } from "../middlewares/auth.middleware";

const router: IRouter = Router();

router.post("/ai/analyze", attachAuthUser, requireAuth, async (req, res) => {
  if (!isAiConfigured()) {
    res.status(500).json({
      error: "AI extraction is not configured yet. Set OPENAI_API_KEY.",
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
