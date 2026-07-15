---
name: Hijri date/time parsing for scheduling
description: How to turn Arabic SMS-style Hijri date + time text into a real JS Date for reminder/scheduling logic.
---

For Saudi/Gulf court or government SMS text carrying Hijri dates (e.g. "27/01/1448") and Arabic time markers (e.g. "12:30 مساء" / "10:00 صباحا"):

- Convert Hijri→Gregorian with the tabular (civil) Islamic calendar algorithm (JDN-based, epoch 1948440). It's an approximation of Umm al-Qura (can be off by a day near month boundaries) but is sufficient for scheduling/reminders, not for religious-calendar accuracy.
- Parse AM/PM by checking for `مساء`/`م` (PM) vs `صباح`/`ص` (AM) after normalizing Arabic-Indic digits (٠-٩) to ASCII.
- Treat the whole region as a single fixed UTC offset (e.g. Asia/Riyadh = UTC+3, no DST) rather than pulling in a full timezone library — good enough for this class of app.

**Why:** no reliable npm package was assumed available/vetted for Umm al-Qura conversion mid-build; a self-contained ~150-line algorithm avoided an unvetted dependency and kept the reminder scheduler's date math auditable.

**How to apply:** reuse this approach whenever a task involves computing real datetimes from Hijri-calendar text rather than reaching for a new hijri conversion library.
