# Court Session Management AI

An internal tool for a law firm's secretary: paste a raw court hearing SMS (usually Arabic), let AI extract the structured hearing details, review/edit them, then save to a Google Sheet that acts as the case log. The dashboard tracks case counts and hearing timing; a background scheduler console-logs 24h/6h reminders before each hearing.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm --filter @workspace/court-session-management run dev` — run the web frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks/Zod schemas after editing `lib/api-spec/openapi.yaml`

### Required secrets (not yet all configured — see below)

| Env var | Purpose |
|---|---|
| `SESSION_SECRET` | Signs the login session cookie. **Already set.** |
| `APP_USERNAME` / `APP_PASSWORD` | The one shared login for the firm's staff (no user database in v1). |
| `OPENAI_API_KEY` | Powers `/ai/analyze` (SMS → structured fields) via the OpenAI API directly (`gpt-4.1-mini`, temperature 0, JSON mode). |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Full JSON key of a Google Cloud service account with access to the target Sheet. |
| `GOOGLE_SPREADSHEET_ID` | The ID (from the sheet's URL) of the spreadsheet used as the session database. |
| `GOOGLE_SHEET_NAME` | Optional; defaults to `Sessions`. |
| `REMINDER_CRON_EXPRESSION` | Optional; defaults to every 10 minutes (`*/10 * * * *`). |
| `COURT_TIMEZONE_OFFSET_HOURS` | Optional; defaults to `3` (Asia/Riyadh), used to interpret Hijri hearing date/time. |

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5, session auth via signed cookie (no DB-backed users)
- Data store: Google Sheets (via `googleapis`), one row per session, sheet row index = record id
- AI extraction: OpenAI SDK (`openai` package) directly, not the Replit AI Integration (declined during setup)
- Scheduler: `node-cron`, sweeps sessions and logs 24h/6h reminders through a pluggable `ReminderChannel` interface (console-only in v1)
- API contract: OpenAPI spec (`lib/api-spec/openapi.yaml`) → Orval codegen → typed React Query hooks (`@workspace/api-client-react`) + Zod validators (`@workspace/api-zod`)
- Frontend: React + Vite, wouter router, shadcn/ui, Tailwind v4, Arabic RTL support, light/dark mode

## Where things live

- `artifacts/api-server/src/config/env.ts` — all env var access (lazy; nothing throws at import time)
- `artifacts/api-server/src/services/googleSheets.service.ts` — low-level Sheets read/write/delete
- `artifacts/api-server/src/services/session.service.ts` — session CRUD + dashboard stats, sheet row ↔ `Session` mapping
- `artifacts/api-server/src/services/ai.service.ts` — OpenAI extraction call
- `artifacts/api-server/src/services/reminder/` — reminder channel interface + console channel
- `artifacts/api-server/src/services/pdf/sessionReportPdf.service.ts` — PDF report generator, built but not yet wired to a route (architecture stub per spec)
- `artifacts/api-server/src/scheduler/reminderScheduler.ts` — node-cron sweep
- `artifacts/api-server/src/utils/hijri.ts` — Hijri date/time parsing + Gregorian conversion for reminder timing
- `lib/api-spec/openapi.yaml` — source of truth for the API contract

## Architecture decisions

- **Google Sheets as the database (v1)**: per explicit product spec, not a technical default. The Sheets connector integration and a secrets-collection form were both offered and declined, so the server reads `GOOGLE_SERVICE_ACCOUNT_JSON`/`GOOGLE_SPREADSHEET_ID` directly from env instead.
- **Session id = sheet row number**: simplest mapping for a Sheets-backed store. Deleting a row shifts every later row's id — acceptable for v1, called out here in case of confusion when ids "change" after a delete.
- **Reminder delivery is pluggable**: `ReminderChannel` interface + a console-only implementation, so future channels (WhatsApp/email/SMS) can be added without touching the scheduler.
- **Dashboard "Today"/"Upcoming"/"Finished" counts are derived, not stored**: computed from the parsed Hijri hearing datetime vs. now, except `Cancelled`/manually-set `Finished` which are always respected. The sheet's `Status` column itself defaults to `Upcoming` and is only changed by explicit user edit or by reaching `Cancelled`/`Finished`.
- **No Postgres/Drizzle usage for this feature** — `lib/db` exists in the monorepo template but is intentionally unused here.

## Product

- Secretary logs in with the firm's shared credentials.
- On `/chat`, pastes a raw hearing SMS, hits Analyze, reviews/edits the AI-extracted fields, and saves — this becomes a new row in the Google Sheet.
- `/sessions` lists all hearings with status filtering; each has a detail/edit page with delete.
- `/` dashboard shows total cases, today's hearings, upcoming hearings, finished hearings.
- Every 10 minutes, the server checks all non-cancelled/non-finished sessions and logs a reminder ~24h and ~6h before each hearing (console only in v1).

## User preferences

- User explicitly declined the Google Sheets integration, a clarifying-questions form, and a secrets-request form (three separate prompts) — build without blocking on these, and don't re-ask unless the user brings it up again.
- Reminder delivery must stay console-log-only for v1, by explicit design (not a placeholder — this is intentional and documented via the `ReminderChannel` interface).

## Gotchas

- The app will run and the UI will load, but login, AI analysis, and all session/dashboard data will 500 with a clear message until the secrets above are set — this is intentional (no mocked data, no silent fallbacks).
- Hijri date parsing expects `DD/MM/YYYY`; time parsing expects a `HH:MM` with an Arabic (`صباحا`/`مساء`) or English AM/PM marker. Unparseable dates/times are stored as-is but excluded from reminder scheduling and derived status.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
