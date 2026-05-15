## Goal
Two parts:
1. **Code cleanup** — delete the orphaned legacy Booking module and rewire the broken "Manage Payments / Invoice" button.
2. **Full booking sweep** — submit each of the 3 application types from BOTH the public website (as a guest) AND the admin panel, then record a payment against one and verify it flows through Payments → Accounting → Receivables → Notifications.

---

## Part 1 — Code cleanup (commit + deploy first)

### Files to delete
- `src/pages/admin/AdminBookingsPage.tsx`
- `src/pages/admin/AdminCreateBookingPage.tsx`

### Files to edit
- `src/components/admin/ApplicationsManager.tsx` — change the `<Link to="/admin/bookings">Manage Payments / Invoice</Link>` button so it routes to the correct payment context. Best target: `/admin/payments?application_id={app.id}&application_type=work_permit` so the Payments page can pre-filter / pre-select the application.
- `src/components/admin/AdminSidebar.tsx` — verify no "Bookings" link remains (looked clean already, but double-check).
- Any other file importing the deleted pages — fix imports.
- `src/pages/admin/AdminWorkPermitPage.tsx` — change hardcoded title `"Fiji Work Permit Applications"` to `"Overseas Work Permit Applications"` and remove hardcoded `Destination: Fiji` line (or make it data-driven from `application_data.destination` if present).
- `src/pages/admin/AdminCustomersPage.tsx` — rename KPI label `"Contracted Pilgrims"` → `"Total Applications"` and `"Contract Amount"` → `"Total Service Fee"` (recruitment-agency wording).

### Acceptance
- `npm run build` succeeds with no broken imports.
- Sidebar still renders all current items.
- Sandbox preview shows Work Permit page with new title and no "Destination: Fiji" line.

After Part 1 builds clean, deliver standard VPS deploy commands so user can pull + reload:
```bash
cd /var/www/alrawsha
git pull origin main
cd /var/www/alrawsha && npm install && npm run build
cd /var/www/alrawsha/server && npm install --omit=dev
pm2 restart alrawsha-api --update-env && pm2 save
pm2 list
```

---

## Part 2 — Full booking sweep (live VPS, after Part 1 deploys)

### Public-website tests (logged out, as guest)
For each of the 3 application types:

1. **Work Permit** — find the public form on the website (likely homepage CTA or `/work-permit` / `/apply`). Fill: Name `TEST-Public-WorkPermit`, phone `01700000091`, position `TEST Driver`, submit. Capture the success message + tracking ID.
2. **Air Ticket** — find public ticket form. Submit `TEST-Public-Ticket`, phone `01700000092`, route DAC→DXB, departure date 30 days out.
3. **Visa Service** — find public visa form. Submit `TEST-Public-Visa`, phone `01700000093`, country UAE, visa type Tourist.

After each submission, log back into admin and verify the application appears in the corresponding admin list with status `New` and the correct `TT-` tracking ID.

### Admin-panel tests (logged in)
For each type:

4. **Work Permit (admin create)** — already done last run (`TT-435722A4`). Verify it still exists.
5. **Air Ticket (admin create)** — open `/admin/tickets`, "+ Add" with TEST-Customer-Rubel, route + dates, save.
6. **Visa Service (admin create)** — open `/admin/visa`, "+ Add" with TEST-Customer-Rubel, country + type, save.

### End-to-end payment test (against one application)
Pick the existing `TT-435722A4`:
7. Set service fee to 50,000 BDT. Save.
8. Click the (now-fixed) "Manage Payments / Invoice" button → should land on `/admin/payments` with the application pre-selected.
9. Record a partial payment of 20,000 BDT via Cash wallet.
10. Verify:
    - Application list shows Paid: 20,000, Due: 30,000.
    - `/admin/accounting` shows the wallet credit.
    - `/admin/ledger` has matching debit/credit entries.
    - `/admin/receivables` lists the application with 30,000 due.
    - `/admin/notifications` log shows the SMS event fired (delivery will fail to dummy phone — that's fine, we just want the log row).
    - Invoice PDF generates and renders correctly.

### Cleanup
- Set all `TEST-` applications and customers to `status='cancelled'` / `status='deleted'`.
- Leave the test payment in place so user can see the accounting trail (it's already excluded from financial calcs because the parent application is cancelled).

---

## Deliverable after Part 2
Single pass/fail table covering all 11 steps, plus screenshots of any failures and a list of remaining test data with its final status.

## Estimated time
Part 1: ~5 min code work + your VPS deploy. Part 2: ~20 min browser automation.
