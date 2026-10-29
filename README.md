# Custom Order Tracker

A local-first queue for makers who take commissions. Track each order as a card that
moves through five lanes — **Quote sent → Deposit in → In the making → Done → Shipped** —
with deposit tracking, deadline countdown chips, client notes, a weekly queue summary,
a printable confirmation note, and CSV export.

Built for woodworkers, artists, bakers, tailors — anyone who takes a deposit up front
and wants to know, at a glance, what is overdue and what money is still owed.

Everything lives in your browser's `localStorage`. **No accounts, no servers, no clouds,
no telemetry.** Plain HTML/CSS/JavaScript with zero dependencies, in a single file.

## How to run it

1. Download or clone this folder.
2. Double-click `index.html` (or open `file:///.../index.html` in any modern browser).
3. Start adding orders.

That's it. There is nothing to install. Works offline once downloaded; your data stays
on that browser on that machine.

## What's inside

- **Status lanes** — five columns, with ◀/▶ buttons to move orders ahead or back.
- **Deposit and balance math** — log payments as they arrive; the app tracks
  deposits in and balance due per order, per lane, and across your whole queue.
- **Deadline countdown chips** — green (comfortable), amber (due within a week),
  red (due today or overdue, with days-overdue count).
- **Client notes** — design choices, care instructions, pickup or shipping plans.
- **Weekly queue summary** — lane counts, deadlines due this week (ISO week, Monday–Sunday),
  overdue count, deposits received this week, and open balance due.
- **Printable confirmation note** — a warm, plain-English order confirmation you can
  print straight from the app or copy as text.
- **CSV export** — one click downloads `custom-orders-YYYY-MM-DD.csv` (RFC 4180 quirk-free
  quoting covered by tests).
- **Maker name** — set your studio name once; it appears on printed notes.

## Backing up your data

Your orders live in the browser's `localStorage` under the key `custom-order-tracker.v1`,
tied to the browser profile and domain/origin of the file you opened. To back up or move
orders to another machine, use **Export CSV**, or open DevTools → Console and copy:

```js
localStorage.getItem('custom-order-tracker.v1')
```

Restore the same way with `localStorage.setItem(...)` on the new machine.

## Tests

The status and totals logic (lane transitions, deposit/balance math, countdown chips,
weekly summary, CSV escaping, validation, storage round-trips) is covered by a
dependency-free test suite:

```bash
node tests.test.js
```

You should see `28 passed, 0 failed`.

## Relationship to other Asdale Dynamics tools

This app is deliberately **not a billing tool** — it has no invoices, tax fields, or
generated statements; it's the workshop queue. If you need formal invoices, that's the
job of an invoicing app (e.g., `invoice-tracker-webapp`), not this one.

## License

MIT — see [LICENSE](LICENSE).

**Copyright (c) 2026 Asdale Dynamics, LLC** — part of the Asdale Dynamics collection of
local-first, beginner-friendly tools. Plain-English explanations live at the hub:
<https://dylanasdale.github.io>.
