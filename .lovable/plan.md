
# Phase 2 — Booking → Payment → Invoice → Refund + Agent Panel

This is a multi-day build on the Node.js/Express + Postgres stack (not Supabase edge functions). All work is on top of the existing `@/lib/api` client and `server/routes/*` patterns. Soft deletes, BDT, bilingual labels, and `TT-` tracking IDs apply throughout.

## Scope confirmed
- Full Phase 2 (MVP + double-entry posting + agent panel + invoice verification + refund approval).
- New clean A4 invoice template (not reusing existing generator).
- Bookings can pick an existing customer OR add a guest inline.

## Modules to build

### 1. Bookings
- Table `bookings`: customer_id (nullable for guests), guest_name/phone/email/address, service_id, agent_id (nullable), tracking_id (`TT-XXXXXXXX`), total_amount, paid_amount, due_amount (generated), status (`pending|confirmed|partially_paid|paid|cancelled|deleted`), notes, created_by, timestamps. Soft-deletable.
- Admin pages: List (`/admin/bookings`), Create dialog (customer picker + inline guest fields), Detail page (overview, payments tab, documents tab, refunds tab, invoice button).
- Server routes: `GET/POST/PATCH /api/bookings`, `DELETE` = soft delete.

### 2. Payments (against a booking)
- Reuse existing `payments` table; require `booking_id`, wallet selection, payment method, optional receipt upload.
- Record payment dialog on booking detail page. Auto-recalc `bookings.paid_amount` / `due_amount` via trigger.
- Server route: `POST /api/bookings/:id/payments`.

### 3. Double-entry accounting hook
- On payment insert: post to `ledger_entries` (debit wallet account, credit "Booking Revenue" account).
- On refund approve: reverse postings (debit "Refunds" / credit wallet).
- Reuse `server/services/accounting.js` if it exists; otherwise add a small `postBookingPayment()` / `postBookingRefund()` helper.
- All postings exclude `cancelled` records from reports.

### 4. Invoice PDF (new clean design)
- A4, dark header band with company logo + tracking ID + QR code linking to `/verify-invoice/:trackingId`.
- Customer block, line items (service + qty + unit + total), payments summary (paid / due), signature block, footer with contact + terms.
- Generated client-side via existing `jspdf` setup in `src/lib/pdfCore.ts`. New file: `src/lib/bookingInvoicePdf.ts`.
- Invoice verification page already exists at `src/pages/VerifyInvoice.tsx` — wire it to query bookings by tracking_id.

### 5. Refunds with approval workflow
- Reuse `refunds` table (already has policy_id, status, deduction_amount, etc.).
- Refund dialog on booking detail: pick policy (auto-calculates deduction & refund amount), method, wallet, reason.
- Status flow: `pending` → admin approves → `approved` (posts to ledger, decrements wallet) → marks booking `cancelled` if full refund.
- Admin page `/admin/refunds` already exists — extend with Approve/Reject actions.

### 6. Agent panel
- New route `/agent` (already scaffolded at `src/pages/agent/AgentPanelPage.tsx`).
- Agent role check via `user_roles` (`agent` role).
- Pages: My Bookings (only ones where `bookings.agent_id = me`), Create Booking (same dialog, agent_id auto-set), My Commissions (computed from booking + commission settings on `agents` table), My Payouts (read-only list from `agent_payouts`).
- Commission posted to ledger when booking is fully paid.

## Technical notes

### Files to create
- `server/routes/bookings.js` — CRUD + payments sub-routes
- `server/routes/refunds.js` — list, approve, reject
- `server/services/accounting.js` — extend with booking helpers (or create)
- `src/pages/admin/AdminBookingsPage.tsx` — list
- `src/pages/admin/AdminBookingDetailPage.tsx` — detail with tabs
- `src/components/admin/BookingCreateDialog.tsx`
- `src/components/admin/RecordPaymentDialog.tsx`
- `src/components/admin/CreateRefundDialog.tsx`
- `src/lib/bookingInvoicePdf.ts`
- `src/pages/agent/AgentBookingsPage.tsx`
- `src/pages/agent/AgentCommissionsPage.tsx`

### Files to modify
- `server/index.js` — mount new routes
- `src/App.tsx` — add admin + agent routes
- `src/components/admin/AdminSidebar.tsx` — add Bookings entry
- `src/pages/admin/AdminRefundsPage.tsx` — add approve/reject
- `src/pages/VerifyInvoice.tsx` — query by tracking_id

### Migrations
1. `bookings` table (if not already complete) + triggers for `paid_amount`/`due_amount` recompute.
2. `ledger_entries` insert helpers (already exists per memory).
3. `agents.commission_rate` if missing.
4. Indexes on `bookings(tracking_id)`, `bookings(customer_id)`, `bookings(agent_id)`, `payments(booking_id)`, `refunds(booking_id)`.

### Suggested execution order
1. DB migration — bookings, triggers, indexes.
2. Server routes — bookings + payments sub-route.
3. Admin Bookings list + create dialog + detail page.
4. Record payment flow + ledger posting.
5. Invoice PDF generator + verification page wiring.
6. Refund dialog + approval flow + ledger reversal.
7. Agent panel pages + role gating.
8. End-to-end smoke test on production: create customer → create booking → record partial payment → generate invoice → verify QR → process refund.

## Deployment
After each merged step: pull on VPS, run migration, `pm2 reload all`. Final smoke test against `https://alrawshaintl.com`.

## Estimate
~6–8 focused work sessions. I will deliver in the order above, asking for approval to deploy after each major step.

---

**Confirm and I'll start with step 1 (DB migration + server routes for bookings).**
