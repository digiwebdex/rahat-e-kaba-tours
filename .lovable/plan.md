## Goal
Deep end-to-end test of every admin module on `https://alrawshaintl.com/admin` using the provided credentials. Create real records tagged with `TEST-` prefix, verify they flow correctly through the system (lists, calculations, PDFs, accounting, reports), then soft-delete / mark cancelled at the end.

## Ground rules
- All test data names/notes prefixed with `TEST-` (e.g. `TEST-Customer-001`, booking notes `TEST RUN 2026-05-15`).
- Notifications left ON per your choice. I'll use a placeholder phone (`01700000000`) so SMS goes nowhere real.
- I will NOT touch: existing real bookings, real customers, CMS content, signature/PDF settings, payment-method config, user roles, primary admin account, backups.
- For each step I'll screenshot + report pass/fail. If a module breaks, I stop and report (no auto-fix in this run — fixes happen in a separate task after we see the full picture).

## Test sequence (live VPS, in order)

1. **Auth & layout** — login, sidebar visibility, role badge, session-timeout hook loaded.
2. **Dashboard** — KPIs render, charts load, no console errors.
3. **Packages** — list loads, open one for read; no edits.
4. **Customers** — create `TEST-Customer-Rubel` with phone `01700000000`.
5. **Create Booking** — make a booking for that customer against an existing package, 1 traveler, note `TEST RUN`. Verify tracking ID, totals, member row.
6. **Bookings list** — filter/search finds it; open detail, generate invoice PDF, verify it renders.
7. **Payments** — record a partial payment against the TEST booking (cash wallet). Verify due/paid recalculation.
8. **Online payment** — initiate SSLCommerz session for the TEST booking, abort at gateway (no card entered). Verify session row created.
9. **Accounting / Cashbook / Ledger** — confirm the payment shows in daily cashbook, wallet balance updated, ledger entries posted.
10. **Receivables / Due alerts** — TEST booking appears with correct due.
11. **Refunds** — create a partial refund against the TEST booking using default policy. Verify deduction math + wallet decrement.
12. **Suppliers / Moallems** — open lists (read), open one profile, verify Hajji count + FIFO advance display.
13. **Supplier payment** — record a small `TEST` supplier payment, verify it appears in supplier ledger and global payment filter.
14. **Work permit / Tickets / Visa modules** — open each list, submit one `TEST-` application in work permit (the `application_data` JSONB column we added earlier).
15. **Reports & Analytics** — open Reports, Analytics, Audit Logs; verify TEST entries are visible and exportable.
16. **Notifications log** — confirm SMS/email events fired for the test booking + payment (status only; phone is dummy so delivery will fail gracefully).
17. **CMS / Settings / Security / Backup pages** — open only (no writes). Confirm they render and permissions work.
18. **Cleanup** — set TEST booking `status='cancelled'`, set TEST customer `status='deleted'`, delete TEST refund/payment if module supports it (otherwise leave cancelled — they're already excluded from financial calcs per project rule).

## Deliverable
A single report at the end with:
- Per-module pass/fail table
- Screenshots of any failures + the relevant network/console error
- List of test records left in the DB and their final status
- Recommended fixes (queued as separate tasks, not applied in this run)

## Estimated time
~15–25 minutes of browser automation depending on page load speeds and how many failures need investigation.

## After approval
Switch me out of Plan mode → I'll start by navigating to `/admin`, logging in, and posting screenshots as I go.
