
# Al Rawsha Recruiting Platform — Full Rebuild Plan

Replace the current Hajj/Umrah codebase with a clean, purpose-built worker recruiting system for three services: **Overseas Work Permit**, **Air Ticket**, **Visa**. Built in 5 phases on the existing stack (React/Vite + Node/Express + local Postgres on VPS).

---

## Scope summary (what changes vs. what stays)

**Wiped (dropped tables + deleted code):**
- Hajj/Umrah business: `moallems`, `moallem_items`, `moallem_payments`, `moallem_commission_payments`, `hotels`, `hotel_rooms`, `hotel_bookings`, `bookings`, `booking_members`, `booking_documents`, `packages`, `payments`, `expenses`, `refunds`, `cancellation_policies`, `installment_plans`, `supplier_contracts`, `supplier_contract_payments`, `supplier_agents` (old), `supplier_agent_items`, `supplier_agent_payments`, `settlements`, `settlement_items`, `service_payments`, `daily_cashbook`, `accounts` (old), `financial_summary`, `site_content`, `cms_versions`, `blog_posts`, `online_payment_sessions`.
- All Hajj/Umrah/Moallem/Hotel pages, components, hooks, PDF templates, edge functions.

**Kept:**
- Auth: `auth.users`, `user_roles`, `has_role()`, `profiles`, admin login.
- Infra: `audit_logs`, `notification_logs`, `notification_settings`, `company_settings`, `admin_2fa`, `otp_codes`.
- `@/lib/api` client, VPS storage at `/server/uploads/`, SSLCommerz service, bcryptjs auth, PM2 deploy flow.
- Brand: TT- tracking prefix, BDT formatting, Noto Sans/Bengali fonts, A4 PDF architecture.

---

## New roles (RBAC)

`admin` · `accountant` · `booking_officer` · `cms` · `referral_agent` · `supplier_agent` · `customer`

---

## Phase 1 — Foundation (schema + admin shell + CMS)

**Database (new tables):**
```text
services            (id, code: 'work_permit'|'air_ticket'|'visa', name, is_active)
service_packages    (id, service_code, country, title, description, base_price, image_url,
                     details JSONB {duty, food, accommodation, contract_years, salary, …},
                     status, show_on_website, sort_order)
customers           (id, user_id NULL, full_name, phone UNIQUE, email, nid, passport_no,
                     address, dob, status)
applications        (id, tracking_id 'TT-XXXXXXXX', service_code, package_id, customer_id,
                     referral_agent_id NULL, supplier_agent_id NULL,
                     application_data JSONB,  -- per-service fields
                     total_amount, paid_amount, due_amount,
                     status: draft|submitted|under_review|approved|rejected|deployed|cancelled,
                     created_at, updated_at)
application_documents (id, application_id, doc_type, file_path, file_name, uploaded_by, verified)
application_status_history (id, application_id, from_status, to_status, note, changed_by, changed_at)

cms_sections        (id, page, section_key, content JSONB, is_visible, sort_order)
cms_versions        (id, section_id, content JSONB, edited_by, created_at)
menu_items          (id, label_en, label_bn, href, parent_id, is_visible, sort_order)
site_settings       (key, value JSONB)  -- logo, contact, social, SEO defaults
```

**Admin shell rebuilt** with new sidebar:
Dashboard · Applications (Work Permit / Air Ticket / Visa tabs) · Customers · Agents · Payments · Accounting · CMS · Reports · Settings · Users

**CMS:** every public page section editable from admin — Hero, About, Services, Why Us, Process, Countries, Testimonials, FAQ, Contact, Footer, Menu, Logo, SEO meta. Version history per section. Image upload via `/server/uploads/cms/`.

---

## Phase 2 — Booking + Payment (customer-facing + admin manual entry)

**Public booking flow** (`/apply/:service`):
1. Pick service → country → package
2. Personal details (auto-fill if logged in / OTP-verified)
3. Service-specific form:
   - Work Permit: passport, education, experience, preferred country/position
   - Air Ticket: from/to, depart/return date, pax, class
   - Visa: visa type, country, travel date, purpose
4. Upload documents (passport scan, photo, NID, education certs — per service)
5. Review → choose payment: **SSLCommerz online** OR **manual proof upload** (bKash/Nagad/bank screenshot)
6. Submit → TT- tracking ID + email/SMS

**Admin manual entry**: same form inside admin "New Application" — creates application + customer in one step, can record cash payment immediately.

**Customer dashboard** (`/my`): list applications, see status timeline, upload missing docs, pay due, download invoice.

**Payment system:**
```text
payment_methods   (id, code, name, type: cash|bkash|nagad|bank|card|gateway,
                   wallet_account_id, requires_proof, is_active)
payments          (id, application_id, customer_id, amount, method_id, wallet_account_id,
                   transaction_ref, proof_file_path, status: pending|verified|rejected,
                   verified_by, paid_at, notes)
online_payment_sessions (id, tran_id, application_id, amount, gateway, status, response JSONB)
```
SSLCommerz IPN + val_id verification reused from existing service.

---

## Phase 3 — Accounting (double-entry, accurate debit/credit)

```text
chart_of_accounts (id, code, name, type: asset|liability|income|expense|equity, parent_id)
wallets           (id, name, type: cash|bank|mobile, account_id, balance, is_active)
journal_entries   (id, entry_date, ref_type, ref_id, description, total_debit, total_credit,
                   created_by)
journal_lines     (id, entry_id, account_id, wallet_id NULL, debit, credit, description)
expenses          (id, date, category, amount, wallet_id, vendor, note, attachment, created_by)
agent_commissions (id, agent_id, application_id, amount, status: accrued|paid, paid_at,
                   payment_id NULL)
supplier_payables (id, supplier_agent_id, application_id, amount_due, amount_paid, status)
```

**Automatic journal entries** on triggers:
- Payment verified → DR wallet, CR service revenue
- Expense recorded → DR expense, CR wallet
- Commission accrued → DR commission expense, CR agent payable
- Commission paid → DR agent payable, CR wallet
- Supplier payment → DR supplier payable, CR wallet
- Refund → DR revenue/refund, CR wallet

Wallet balances and dashboard KPIs recalc via triggers on `journal_lines` insert. All reports exclude `status='cancelled'`.

**Dashboard live KPIs:** Total Revenue · Total Expense · Net Profit · Cash in Hand (per wallet) · Receivables · Payables · Commissions Due · Applications by status (per service) · Monthly trend chart.

---

## Phase 4 — Agent panels (two separate)

**Referral Agent panel** (`/agent`):
- Login (provisioned by admin)
- Submit new application on behalf of a customer (same booking form, auto-tags `referral_agent_id`)
- My Applications (status, payment status)
- My Commissions (accrued, paid, balance)
- Request withdrawal → admin approves → creates payment entry
- Commission rule: per-service flat or % configured in admin per agent or per package

**Supplier Agent panel** (`/supplier`):
- Login
- Assigned Applications (Work Permit candidates, Visa cases routed by country)
- Upload demand letter / visa copy / contract per applicant
- Update fulfillment status (visa-applied, visa-approved, ticket-issued, deployed)
- Payables to me: see what your company owes them, payment history
- Download statement PDF

Both panels are read-scoped via RLS-equivalent server-side checks in `@/lib/api`.

---

## Phase 5 — Invoices, reports, notifications, polish

**Invoices** (PDF, A4, reusing pdfCore + signature engine):
- Customer Invoice (per application) — auto-generated on creation, downloadable, printable, payment schedule, all application_data fields, QR for verification
- Payment Receipt (per payment)
- Agent Commission Statement
- Supplier Statement
- Expense Voucher

**Reports** (admin, with date filters + CSV/PDF export):
- Daily Cashbook (all wallet ins/outs)
- Revenue by Service / by Country / by Agent
- Outstanding Dues (customer-wise)
- Agent Commission Report
- Supplier Payable Report
- Profit & Loss
- Trial Balance
- Application Pipeline Report

**Notifications:** application submitted, document missing, payment received, status changed, commission paid — SMS via existing 880-prefix normalizer + email.

**Final polish:** SEO meta from CMS, sitemap regen, audit log every admin write, 2FA for admin, backup script updated for new tables.

---

## Technical / migration notes

- **Migration strategy**: single timestamped down+up migration. Down drops all old business tables. Up creates new schema. `schema.sql` rewritten to match. Backup restore order updated.
- **Code deletion**: remove `src/pages/admin/AdminMoallem*`, `AdminHotels*`, `AdminPackagesPage` (replaced), `AdminWorkPermitPage` (replaced), all Hajj components, Moallem/Hotel managers, old PDF templates.
- **Type regen**: after each phase migration, Supabase types regenerate automatically.
- **Deploy per phase** on VPS: `git pull && npm run build && pm2 reload all && pm2 save`. Each phase ships independently and is testable end-to-end before next phase starts.
- **Estimated phases**: P1 ~1 day, P2 ~2 days, P3 ~2 days, P4 ~1.5 days, P5 ~1.5 days.

---

## What I need from you to start Phase 1

1. **Confirm wipe** — I will drop all Hajj/Hotel/Moallem tables and code. Backups exist via your existing backup system, but this is irreversible in the live DB.
2. **Frontend palette/style direction** — keep current dark/gold Al Rawsha look, or refresh? (If keep, no action needed.)
3. **Commission default** — flat BDT per application or % of total? (Can be per-agent override either way.)

Approve this plan and I'll start Phase 1 (schema wipe + new tables + admin shell + CMS).
