import type { Session, SessionInput, SessionUpdate, SessionStatus } from "@workspace/api-client-react";
import {
  appendRow,
  deleteRow,
  ensureSheetReady,
  listRows,
  SHEET_COLUMNS,
  updateRow,
  updateRowCells,
  type SheetRow,
} from "./googleSheets.service";
import { computeHearingDateTime } from "../utils/hijri";

const COLUMN_INDEX: Record<string, number> = SHEET_COLUMNS.reduce(
  (acc, col, i) => ({ ...acc, [col]: i }),
  {} as Record<string, number>,
);

function cell(row: SheetRow, name: (typeof SHEET_COLUMNS)[number]): string {
  return row[COLUMN_INDEX[name]] ?? "";
}

function nullableString(value: string): string | null {
  return value === "" ? null : value;
}

function rowToSession(id: number, row: SheetRow): Session {
  return {
    id,
    caseNumber: nullableString(cell(row, "Case Number")),
    plaintiff: nullableString(cell(row, "Plaintiff")),
    defendant: nullableString(cell(row, "Defendant")),
    court: nullableString(cell(row, "Court")),
    courtCircuit: nullableString(cell(row, "Court Circuit")),
    caseSubject: nullableString(cell(row, "Case Subject")),
    sessionType: nullableString(cell(row, "Session Type")),
    sessionDateHijri: nullableString(cell(row, "Session Date Hijri")),
    sessionTime: nullableString(cell(row, "Session Time")),
    notes: nullableString(cell(row, "Notes")),
    status: (cell(row, "Status") || "Upcoming") as SessionStatus,
    reminder24: cell(row, "Reminder24") === "true",
    reminder6: cell(row, "Reminder6") === "true",
    createdAt: cell(row, "Created At") || new Date().toISOString(),
  };
}

function sessionInputToRow(input: SessionInput, createdAt: string): SheetRow {
  return [
    input.caseNumber ?? "",
    input.plaintiff ?? "",
    input.defendant ?? "",
    input.court ?? "",
    input.courtCircuit ?? "",
    input.caseSubject ?? "",
    input.sessionType ?? "",
    input.sessionDateHijri ?? "",
    input.sessionTime ?? "",
    input.notes ?? "",
    "Upcoming",
    "false",
    "false",
    createdAt,
  ];
}

/** Derives dashboard-facing status from the stored status + parsed hearing date, without persisting anything. */
function deriveEffectiveStatus(session: Session): SessionStatus {
  if (session.status === "Cancelled" || session.status === "Finished") {
    return session.status;
  }
  const hearingAt = computeHearingDateTime(
    session.sessionDateHijri,
    session.sessionTime,
  );
  if (!hearingAt) {
    return session.status;
  }
  const now = new Date();
  if (hearingAt.getTime() < now.getTime()) {
    return "Finished";
  }
  const isSameDay =
    hearingAt.getUTCFullYear() === now.getUTCFullYear() &&
    hearingAt.getUTCMonth() === now.getUTCMonth() &&
    hearingAt.getUTCDate() === now.getUTCDate();
  return isSameDay ? "Today" : "Upcoming";
}

export async function listSessions(statusFilter?: SessionStatus): Promise<Session[]> {
  await ensureSheetReady();
  const rows = await listRows();
  const sessions = rows.map(({ id, values }) => rowToSession(id, values));
  if (!statusFilter) {
    return sessions;
  }
  return sessions.filter((s) => deriveEffectiveStatus(s) === statusFilter);
}

export async function getSessionById(id: number): Promise<Session | null> {
  const rows = await listRows();
  const match = rows.find((r) => r.id === id);
  return match ? rowToSession(match.id, match.values) : null;
}

export async function createSession(input: SessionInput): Promise<Session> {
  await ensureSheetReady();
  const createdAt = new Date().toISOString();
  const row = sessionInputToRow(input, createdAt);
  const id = await appendRow(row);
  return rowToSession(id, row);
}

export async function updateSession(
  id: number,
  patch: SessionUpdate,
): Promise<Session | null> {
  const existing = await getSessionById(id);
  if (!existing) {
    return null;
  }
  const merged: Session = {
    ...existing,
    ...Object.fromEntries(
      Object.entries(patch).filter(([, value]) => value !== undefined),
    ),
  };
  const row: SheetRow = [
    merged.caseNumber ?? "",
    merged.plaintiff ?? "",
    merged.defendant ?? "",
    merged.court ?? "",
    merged.courtCircuit ?? "",
    merged.caseSubject ?? "",
    merged.sessionType ?? "",
    merged.sessionDateHijri ?? "",
    merged.sessionTime ?? "",
    merged.notes ?? "",
    merged.status,
    String(merged.reminder24),
    String(merged.reminder6),
    merged.createdAt,
  ];
  await updateRow(id, row);
  return merged;
}

export async function deleteSession(id: number): Promise<boolean> {
  const existing = await getSessionById(id);
  if (!existing) {
    return false;
  }
  await deleteRow(id);
  return true;
}

export interface DashboardStats {
  totalCases: number;
  todayHearings: number;
  upcomingHearings: number;
  finishedHearings: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const sessions = await listSessions();
  let todayHearings = 0;
  let upcomingHearings = 0;
  let finishedHearings = 0;
  for (const session of sessions) {
    const effective = deriveEffectiveStatus(session);
    if (effective === "Today") todayHearings += 1;
    else if (effective === "Upcoming") upcomingHearings += 1;
    else if (effective === "Finished") finishedHearings += 1;
  }
  return {
    totalCases: sessions.length,
    todayHearings,
    upcomingHearings,
    finishedHearings,
  };
}

/** Marks a session's Reminder24/Reminder6 flag as sent (used by the scheduler). */
export async function markReminderSent(
  id: number,
  kind: "24h" | "6h",
): Promise<void> {
  const columnName = kind === "24h" ? "Reminder24" : "Reminder6";
  await updateRowCells(id, { [COLUMN_INDEX[columnName]]: "true" });
}
