import OpenAI from "openai";
import { env } from "../config/env";
import { logger } from "../lib/logger";
import {
  SESSION_EXTRACTION_SYSTEM_PROMPT,
  buildExtractionUserPrompt,
} from "../prompts/extraction.prompt";
import type { SessionExtraction } from "@workspace/api-client-react";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: env.openaiApiKey });
  }
  return client;
}

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
 * Sends a raw court SMS message to OpenAI and returns the extracted,
 * structured hearing fields. Any field the model can't find comes back as
 * null (never invented, never omitted).
 */
export async function analyzeCourtMessage(
  message: string,
): Promise<SessionExtraction> {
  const openai = getClient();

  let completion;
  try {
    completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SESSION_EXTRACTION_SYSTEM_PROMPT },
        { role: "user", content: buildExtractionUserPrompt(message) },
      ],
    });
  } catch (err) {
    logger.error({ err }, "OpenAI extraction request failed");
    throw new AiExtractionError(
      "Failed to reach the AI extraction service. Please try again.",
    );
  }

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new AiExtractionError("The AI extraction service returned no content.");
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content) as Record<string, unknown>;
  } catch {
    logger.error({ content }, "AI extraction returned non-JSON content");
    throw new AiExtractionError(
      "The AI extraction service returned an invalid response.",
    );
  }

  const result = {} as SessionExtraction;
  for (const field of EXTRACTION_FIELDS) {
    const value = parsed[field];
    result[field] = typeof value === "string" && value.trim() !== "" ? value : null;
  }
  return result;
}
