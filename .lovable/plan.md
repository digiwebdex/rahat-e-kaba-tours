
# সম্পূর্ণ সিস্টেম প্ল্যান — Manasik Travel Hub

## ১. লক্ষ্য (Goal)
তিনটি সার্ভিস — **Overseas Work Permit**, **Air Ticket**, **Visa Service** — এর জন্য একটি ইউনিফাইড বুকিং + পেমেন্ট + অ্যাকাউন্টিং সিস্টেম, যা পাবলিক ওয়েবসাইট এবং অ্যাডমিন প্যানেল উভয় দিক থেকে কাজ করবে এবং সব টাকার গতি ক্রেডিট/ডেবিট হিসেবে ওয়ালেট অ্যাকাউন্টে রেকর্ড হবে।

---

## ২. পাবলিক ওয়েবসাইটে বুকিং ফ্লো (Guest / Customer)

প্রতিটি সার্ভিসের জন্য আলাদা "Apply / Book Now" ফর্ম, কিন্তু একই শেয়ার্ড কম্পোনেন্ট:

**ধাপ ১ — প্যাকেজ নির্বাচন**
- `packages` টেবিল থেকে সেই সার্ভিস টাইপের সব active প্যাকেজ ড্রপডাউনে দেখাবে (work_permit / air_ticket / visa)
- প্যাকেজ সিলেক্ট করলে দাম অটো শো হবে

**ধাপ ২ — পার্সোনাল ডিটেইলস**
- নাম, ফোন, ইমেইল, ঠিকানা, পাসপোর্ট নম্বর, NID, DOB, ইমার্জেন্সি কন্টাক্ট

**ধাপ ৩ — ডকুমেন্ট আপলোড**
- পাসপোর্ট, ছবি, NID, শিক্ষাগত সনদ ইত্যাদি (সার্ভিস অনুযায়ী ডায়নামিক লিস্ট)
- `booking_documents` টেবিলে সেভ

**ধাপ ৪ — পেমেন্ট অপশন (Without / With Payment)**
- "Pay Later" → বুকিং `pending` স্ট্যাটাসে সেভ হবে, পুরো অ্যামাউন্ট due
- "Pay Now / Advance" → ইউজার অ্যামাউন্ট লিখবে (full বা partial advance)
  - পেমেন্ট মেথড ড্রপডাউন → **`company_settings.payment_methods`** থেকে enabled মেথডগুলো (bKash, Nagad, Bank, Cash, Card ইত্যাদি)
  - SSLCommerz অনলাইন গেটওয়েতে রিডাইরেক্ট (bKash/Nagad/Card)
  - অফলাইন মেথড সিলেক্ট করলে "Pay later in office" নোট

**ধাপ ৫ — Confirmation**
- Tracking ID (TT-XXXXX), Invoice PDF ডাউনলোড, "Pay Online" বাটন থাকবে

---

## ৩. অ্যাডমিন প্যানেল — ম্যানুয়াল বুকিং ফ্লো

প্রতিটি সার্ভিসের পেজে (`/admin/work-permit`, `/admin/tickets`, `/admin/visa`) একটাই কমন "New Booking" ডায়লগ:

**ফর্ম ফিল্ডস:**
1. **Customer Selection** — existing customer search OR new customer create (নাম/ফোন/ঠিকানা/পাসপোর্ট)
2. **Package** — সব প্যাকেজ ড্রপডাউনে, সিলেক্ট করলে দাম অটো-ফিল
3. **Quantity / Travelers** — সংখ্যা
4. **Selling Price / Discount** — এডিটেবল
5. **Middleman (Optional)** — `supplier_agents` টেবিল থেকে dropdown, commission per person সেট করা যাবে
6. **Supplier (Optional)** — কোন সাপ্লায়ারের কাছ থেকে সার্ভিস কিনছে, cost price সেট
7. **Document Upload** — multi-file
8. **Advance Payment Section:**
   - Amount input
   - Payment Method dropdown (configured methods)
   - **Wallet Account dropdown** (Cash/bKash/Bank account থেকে কোথায় ক্রেডিট হবে)
   - Transaction ref, receipt upload
9. **Notes**

**Save করলে:**
- `bookings` রো তৈরি (total_amount, paid_amount, due_amount, service_type, status='pending')
- `payments` রো (যদি advance থাকে) → wallet ক্রেডিট
- `booking_documents` রো
- কাস্টমার লিস্টে শো
- সংশ্লিষ্ট সার্ভিস টেবিলে শো (Work Permit / Tickets / Visa)

---

## ৪. বুকিং টেবিল ম্যানেজমেন্ট (তিনটি সার্ভিস পেজে)

প্রতিটি বুকিং রো-তে অ্যাকশন:
- ✏️ **Edit** — সব ফিল্ড এডিট
- 🗑️ **Delete** — soft delete (status='deleted')
- 🔁 **Status Change** — pending → processing → confirmed → completed / cancelled
- 💰 **Add Payment** — payment dialog (method, wallet, amount, receipt)
- 📄 **Documents** — view/add/remove
- 🧾 **Invoice PDF**
- 👤 **Middleman Commission** — middleman সিলেক্ট থাকলে commission পেমেন্ট রেকর্ড

ফিল্টার: status, date range, customer, middleman, supplier

---

## ৫. পেমেন্ট ও অ্যাকাউন্টিং ইঞ্জিন (Credit / Debit)

প্রতিটি ট্রানজেকশন `wallet_account_id` এর সাথে লিংকড — যাতে রিপোর্টে দেখা যায় কোন একাউন্টে কত আছে।

| ট্রানজেকশন টাইপ | দিক | যেখানে রেকর্ড |
|---|---|---|
| Customer payment (booking) | **Credit** wallet | `payments` |
| Middleman payment (commission) | **Debit** wallet | `moallem_commission_payments` |
| Supplier payment | **Debit** wallet | `supplier_agent_payments` |
| Refund to customer | **Debit** wallet | `refunds` |
| Office expense | **Debit** wallet | `expenses` |
| Manual cash entry | Credit/Debit | `daily_cashbook` |

**Wallet Balance Triggers** — ইতিমধ্যে আছে, ভেরিফাই করব যে সব নতুন path-এ ট্রিগার ফায়ার করছে।

---

## ৬. মিডলম্যান (Middleman) ফ্লো
- বুকিং তৈরি করার সময় middleman সিলেক্ট হলে → `bookings.supplier_agent_id` সেট
- Commission auto-calculate (per person × travelers)
- "Middleman Profile" পেজে: total commission earned, paid, due
- "Pay Middleman" বাটন → wallet থেকে debit, receipt upload

---

## ৭. সাপ্লায়ার (Supplier) ফ্লো
- বুকিংয়ে cost price entry → `supplier_due` auto
- Supplier Contracts পেজে আলাদা contracts
- "Pay Supplier" → wallet debit, payment record

---

## ৮. রিপোর্ট ও ড্যাশবোর্ড

**নতুন/আপডেটেড রিপোর্ট:**
1. **Wallet Balance Report** — প্রতিটি অ্যাকাউন্টের current balance + transactions log
2. **Service-wise Revenue** — Work Permit / Air Ticket / Visa breakdown
3. **Customer Ledger** — per customer paid/due
4. **Middleman Ledger** — commission earned/paid/due
5. **Supplier Ledger**
6. **Daily Cashbook** — সব credit/debit একসাথে
7. **Profit & Loss** — selling - cost - commission - expense

---

## ৯. টেকনিক্যাল সেকশন (Technical Details)

### Database Changes (migration প্রয়োজন)
- `bookings.service_type` enum check → ('work_permit', 'air_ticket', 'visa', 'umrah', 'hajj', 'other') ✅ আছে
- নিশ্চিত করা: `payments.wallet_account_id` NOT NULL when status='completed' (validation trigger)
- নতুন view: `v_wallet_balances` — প্রতিটি wallet এর running balance
- নতুন view: `v_customer_ledger`, `v_middleman_ledger`, `v_supplier_ledger`

### Frontend — নতুন/রিফ্যাক্টর কম্পোনেন্ট
```text
src/components/
├── booking/
│   ├── UnifiedBookingDialog.tsx        (NEW — admin manual booking, service-aware)
│   ├── PackageSelectStep.tsx           (NEW)
│   ├── CustomerSelectStep.tsx          (reuse CustomerSearchSelect)
│   ├── MiddlemanSupplierStep.tsx       (NEW)
│   ├── AdvancePaymentStep.tsx          (NEW — wallet+method+amount)
│   └── DocumentUploadStep.tsx          (existing)
├── ApplyDialog.tsx                     (REFACTOR — public form, share steps)
└── admin/
    ├── ApplicationsManager.tsx         (EXTEND — Edit/Delete/Status/AddPayment all wired)
    └── ServicePaymentDialog.tsx        (EXTEND — wallet dropdown mandatory)
```

### Pages
- `AdminWorkPermitPage`, `AdminTicketsPage`, `AdminVisaPage` — একই `ApplicationsManager` ব্যবহার করবে, শুধু `serviceType` prop ভিন্ন
- `AdminPaymentsPage` — সব service-এর পেমেন্ট unified view
- `AdminLedgerPage` — wallet-wise + entity-wise ledger

### Hooks
- `usePaymentMethods` (existing) — enabled methods
- `useWalletAccounts` (NEW) — `accounts` table থেকে active wallets
- `useActivePackagesByService(serviceType)` — filter by type

### Backend (Node/Express + Postgres)
- `POST /api/bookings` — unified create (handles public + admin)
- `POST /api/bookings/:id/payments` — add payment, auto wallet credit
- `PATCH /api/bookings/:id` — edit
- `PATCH /api/bookings/:id/status` — status change
- `DELETE /api/bookings/:id` — soft delete
- `POST /api/middleman/:id/payments` — wallet debit
- `POST /api/suppliers/:id/payments` — wallet debit
- সব রুটে `pg_safeupdate` compliant WHERE clauses

### SSLCommerz Integration
- ইতিমধ্যে আছে — IPN + val_id verification নিশ্চিত
- Public form submit → online pay button → success → `payments` insert + wallet credit + booking paid_amount update

---

## ১০. ইমপ্লিমেন্টেশন স্টেপ (পর্যায়ক্রমে)

**Phase 1 — Foundation**
1. Database migration: validation triggers, ledger views, wallet enforcement
2. `useWalletAccounts` hook
3. `usePaymentMethods` (already done) verify

**Phase 2 — Unified Booking Dialog (Admin)**
4. Build `UnifiedBookingDialog` with all 5 steps
5. Wire into Work Permit / Ticket / Visa pages
6. Edit / Delete / Status change buttons fully functional

**Phase 3 — Public Apply Form Refactor**
7. `ApplyDialog` uses same step components
8. Pay-online + Pay-later branches
9. SSLCommerz return handler → wallet credit

**Phase 4 — Payment & Wallet**
10. `ServicePaymentDialog` — mandatory wallet select, all methods
11. Wallet balance live view in admin sidebar
12. Add-payment from booking row

**Phase 5 — Middleman & Supplier**
13. Middleman select in booking form, auto commission calc
14. Pay Middleman dialog (wallet debit)
15. Pay Supplier dialog (wallet debit)

**Phase 6 — Reports**
16. Wallet balance report
17. Service-wise revenue dashboard widget
18. Customer / Middleman / Supplier ledger pages
19. Daily cashbook with all sources unified

**Phase 7 — QA & Deploy**
20. Test full flow: public order → admin sees pending → add payment → wallet credits → middleman pays → wallet debits → report matches
21. VPS deploy: `cd /var/www/alrawsha && git pull && npm install && npm run build && pm2 reload all && pm2 save`

---

## ১১. প্রশ্ন (Confirm করার আগে)

1. **Air Ticket** এবং **Visa** এর জন্যও পাবলিক "Apply" ফর্ম চালু করব? (এখন শুধু Work Permit + Student-এ আছে)
2. পাবলিক ফর্মে কাস্টমার লগইন বাধ্যতামূলক, নাকি গেস্ট বুকিং allowed (OTP দিয়ে phone verify)?
3. মিডলম্যানদের কি নিজস্ব লগইন দরকার (যাতে নিজে commission দেখতে পারে), নাকি শুধু অ্যাডমিন রেকর্ড রাখবে?
4. Phase ১-৭ একটানা করব নাকি Phase ১+২ আগে ডেলিভার করে আপনি টেস্ট করার পর বাকিগুলো?

আপনার উত্তর পেলে "Implement plan" বাটন চেপে শুরু করব।
