---
name: Google Sheets as application database
description: Pattern used when a user explicitly wants a Google Sheet (not Postgres) as the backing store for a CRUD resource.
---

When a spreadsheet is the source of truth instead of a real database:

- Use the row's 1-based sheet row number as the record `id`. Simple, but deleting a row shifts every later row's id — document this loudly wherever ids are exposed, since it surprises people used to stable DB primary keys.
- Never read the service-account JSON / spreadsheet ID at module import time. Wrap all such env access behind lazy getters (throw only when actually called) so the server can boot and serve unrelated routes even before Sheets credentials exist.
- Self-heal the header row on every write path (check it matches the expected column list; rewrite if not) rather than assuming a human set it up correctly — avoids silent column-misalignment bugs.

**Why:** built for a case where the user explicitly declined both the Google Sheets integration/connector and a secrets-collection form (twice), so the app had to be built to run in a "not yet configured" state without crashing, and to degrade to clear per-route 500s instead.

**How to apply:** any future request for "use a Google Sheet as my data store" — reuse this shape (lazy env, row-id-as-PK, header self-heal) rather than reinventing it.
