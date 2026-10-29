# STATUS.md — Custom Order Tracker

**Date:** 2026-10-28
**Folder:** `custom-order-tracker-webapp`
**Owner:** Asdale Dynamics, LLC

## What was built

A single-file, offline, local-first web app for makers who take commissions:

- `index.html` — the entire app (HTML + CSS + JS, no dependencies, no build step):
  - Five status lanes: Quote sent / Deposit in / In the making / Done / Shipped,
    with ◀▶ buttons to move orders between lanes.
  - Order cards with client name, item description, total price, logged deposit
    payments (with dates, editable/removable), balance due, and client notes.
  - Deadline countdown chips: "Due in N days" (green ≥ 8 days), amber (≤ 7 days),
    red for due-today and "Overdue by Nd".
  - Totals bar: open orders, total order value, deposits in, balance due — overall
    and per-lane footers.
  - Weekly queue summary (collapsible): lane counts, deadlines due this week
    (ISO Monday–Sunday), overdue count, deposits received this week,
    open balance due (excluding shipped).
  - Printable confirmation note: warm plain-English summary per order with
    Print (dedicated print stylesheet) and Copy-text buttons.
  - CSV export (RFC-4180-style quoting) labeled `custom-orders-YYYY-MM-DD.csv`.
  - Maker name setting shown on printed notes.
  - Persistence in `localStorage` key `custom-order-tracker.v1`; survives reload,
    degrades gracefully to in-memory if storage is blocked; corrupt data is
    repaired to an empty queue rather than crashing.
- `tests.test.js` — dependency-free Node test suite covering the status/totals logic.
- `README.md`, `LICENSE` (MIT, exact line "Copyright (c) 2026 Asdale Dynamics, LLC").
- This `STATUS.md`.

## How to run it

- Open `index.html` by double-clicking it or `file:///path/to/index.html` — no server,
  no install, works offline.
- Run the tests: `node tests.test.js` (Node 18+; uses only the standard library).

## Verification results

- `node tests.test.js` → **28 passed, 0 failed** (status labels/validation, countdown
  chips incl. boundary cases, deposit/balance math, totals per lane, weekly queue
  windowing & overdue count, CSV escaping incl. commas/quotes/newlines, validation
  errors, storage round-trip + corruption repair, lane-shift clamping,
  confirmation note contents).
- Headless Chrome (`--headless=new --dump-dom file://…`) boot smoke test → PASS:
  5 lanes render, totals tile populated, no JS errors on load.
- Headless Chrome interaction smoke test with seeded localStorage → PASS:
  2 seeded cards render in correct lanes, correct balance ($140.00 on a $240 order
  with $100 deposit), correct chip ("Due in 1 day"), maker name prefilled,
  confirmation note opens with correct status, amounts, and deadline.

## Known gaps

- No multi-currency support (US$ formatting only); add/currency is trivial to extend.
- No import side for CSV/backups (export only); restore is manual via DevTools.
- No drag-and-drop between lanes (▶/◀ buttons only); also no keyboard arrows for lanes.
- Data is private to one browser on one machine — clearing browser data erases the
  queue; use CSV export or copy the localStorage JSON to back up.
- Print styling is tuned for US Letter/Chrome; some other engines may paginate differently.
- The app is intentionally *not* invoicing software — no tax, line-item breakdowns,
  or statements (that's a different tool).
