/**
 * PDF report architecture (v1 scaffold — full report design comes later).
 *
 * Intended usage once wired up: an authenticated route (e.g.
 * `GET /api/sessions/:id/report.pdf`) will call
 * `generateSessionReportPdf(session)` and stream the resulting bytes back
 * with `Content-Type: application/pdf`. Kept as a standalone service so the
 * eventual route handler stays thin, and so the report layout can grow
 * (firm letterhead, multi-session batch reports, etc.) without touching
 * calling code.
 */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Session } from "@workspace/api-client-react";

const FIELD_LABELS: Array<[keyof Session, string]> = [
  ["caseNumber", "Case Number"],
  ["plaintiff", "Plaintiff"],
  ["defendant", "Defendant"],
  ["court", "Court"],
  ["courtCircuit", "Court Circuit"],
  ["caseSubject", "Case Subject"],
  ["sessionType", "Session Type"],
  ["sessionDateHijri", "Session Date (Hijri)"],
  ["sessionTime", "Session Time"],
  ["status", "Status"],
  ["notes", "Notes"],
];

/** Generates a minimal one-page PDF summary of a single hearing session. */
export async function generateSessionReportPdf(
  session: Session,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  let y = 800;
  page.drawText("Court Hearing Session Report", {
    x: 50,
    y,
    size: 16,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 30;

  for (const [key, label] of FIELD_LABELS) {
    const value = session[key];
    const text = `${label}: ${value === null || value === undefined ? "-" : String(value)}`;
    page.drawText(text, { x: 50, y, size: 11, font, color: rgb(0.2, 0.2, 0.2) });
    y -= 20;
  }

  return doc.save();
}
