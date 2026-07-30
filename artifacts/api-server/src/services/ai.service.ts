import { HfInference } from "@huggingface/inference";
import { getSettings } from "../config/settings-store";
import { logger } from "../lib/logger";
import {
  SESSION_EXTRACTION_SYSTEM_PROMPT,
  buildExtractionUserPrompt,
} from "../prompts/extraction.prompt";
import type { SessionExtraction } from "@workspace/api-client-react";

export class AiExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiExtractionError";
  }
}

/**
 * Sends a raw court SMS message to the AI API and returns the
 * extracted, structured hearing fields. Any field the model can't find comes
 * back as null (never invented, never omitted).
 */

export async function analyzeCourtMessage(
  message: string,
): Promise<SessionExtraction> {
  const settings = getSettings();
  const token = settings.hfApiToken;
  const model = settings.hfModel || "meta-llama/Llama-3.1-8B-Instruct";

  if (!token) {
    throw new AiExtractionError("يرجى إدخال رمز Hugging Face Access Token في الإعدادات أولاً.");
  }

  const hf = new HfInference(token);

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
    });
    raw = response.choices[0]?.message?.content ?? undefined;
  } catch (err: any) {
    logger.error({ err }, "Hugging Face AI extraction request failed");
    throw new AiExtractionError(
      `فشل الاتصال بمزود الذكاء الاصطناعي (Hugging Face): ${err?.message || "خطأ غير معروف"}`
    );
  }


  if (!raw) {
    throw new AiExtractionError("لم يُرجع نموذج الذكاء الاصطناعي أي محتوى.");
  }

  logger.info({ raw }, "Raw AI response received");

  // Strategy 1: extract from markdown code block ```json ... ```
  let jsonStr: string | null = null;
  const mdMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (mdMatch) {
    jsonStr = mdMatch[1].trim();
  }

  // Strategy 2: find the first { ... } block in the response
  if (!jsonStr) {
    const braceStart = raw.indexOf("{");
    const braceEnd = raw.lastIndexOf("}");
    if (braceStart !== -1 && braceEnd > braceStart) {
      jsonStr = raw.substring(braceStart, braceEnd + 1).trim();
    }
  }

  // Strategy 3: use raw content as-is
  if (!jsonStr) {
    jsonStr = raw.trim();
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonStr) as Record<string, unknown>;
  } catch {
    logger.error({ raw, jsonStr }, "AI extraction returned non-JSON content");
    throw new AiExtractionError(
      "أرجع النموذج استجابةً غير صالحة. يرجى المحاولة مرة أخرى.",
    );
  }


  const result = {} as SessionExtraction;
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

  for (const field of EXTRACTION_FIELDS) {
    const val = parsed[field];
    if (typeof val === "string" && val.trim().length > 0) {
      result[field] = val.trim();
    } else {
      result[field] = null;
    }
  }

  return result;
}
