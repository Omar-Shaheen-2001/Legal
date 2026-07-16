import { HfInference } from "@huggingface/inference";
import { env } from "../config/env";
import { logger } from "../lib/logger";
import {
  SESSION_EXTRACTION_SYSTEM_PROMPT,
  buildExtractionUserPrompt,
} from "../prompts/extraction.prompt";
import type { SessionExtraction } from "@workspace/api-client-react";

const EXTRACTION_FIELDS = [
  "case_number",
  "plaintiff",
  "defendant",
  "court",
  "court_circuit",
  "case_subject",
  "session_type",
  "session_date_hijri",
  "session_time",
  "notes",
] as const;

export class AiExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiExtractionError";
  }
}

/**
 * Sends a raw court SMS message to Hugging Face Inference and returns the
 * extracted, structured hearing fields. Any field the model can't find comes
 * back as null (never invented, never omitted).
 */
export async function analyzeCourtMessage(
  message: string,
): Promise<SessionExtraction> {
  const hf = new HfInference(env.hfApiToken);
  const model = env.hfModel;

  let raw: string | undefined;
  try {
    const response = await hf.chatCompletion({
      model,
      messages: [
        { role: "system", content: SESSION_EXTRACTION_SYSTEM_PROMPT },
        { role: "user", content: buildExtractionUserPrompt(message) },
      ],
      parameters: {
        temperature: 0.1,
        max_new_tokens: 512,
      },
      response_format: { type: "json_object" },
    });
    raw = response.choices[0]?.message?.content ?? undefined;
  } catch (err) {
    logger.error({ err }, "HuggingFace extraction request failed");
    // Some deployments don't support response_format — retry without it
    try {
      logger.warn("Retrying without response_format constraint");
      const hf2 = new HfInference(env.hfApiToken);
      const response2 = await hf2.chatCompletion({
        model,
        messages: [
          { role: "system", content: SESSION_EXTRACTION_SYSTEM_PROMPT },
          { role: "user", content: buildExtractionUserPrompt(message) },
        ],
        parameters: {
          temperature: 0.1,
          max_new_tokens: 512,
        },
      });
      raw = response2.choices[0]?.message?.content ?? undefined;
    } catch (err2) {
      logger.error({ err2 }, "HuggingFace extraction retry also failed");
      throw new AiExtractionError(
        "تعذّر الوصول إلى خدمة الذكاء الاصطناعي. يرجى المحاولة مرة أخرى.",
      );
    }
  }

  if (!raw) {
    throw new AiExtractionError("لم يُرجع نموذج الذكاء الاصطناعي أي محتوى.");
  }

  // Extract JSON block from response (model may wrap it in markdown fences)
  const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? null;
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : raw.trim();

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonStr) as Record<string, unknown>;
  } catch {
    logger.error({ raw }, "AI extraction returned non-JSON content");
    throw new AiExtractionError(
      "أرجع النموذج استجابةً غير صالحة. يرجى المحاولة مرة أخرى.",
    );
  }

  const result = {} as SessionExtraction;
  for (const field of EXTRACTION_FIELDS) {
    const value = parsed[field];
    result[field] =
      typeof value === "string" && value.trim() !== "" ? value : null;
  }
  return result;
}
