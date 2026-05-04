## Goal

Rebrand this remixed project from **TRIP TASTIC** to **Hasan Travels** — name only for now. Once you upload the Facebook logo screenshot, I'll extract a matching color palette and apply it across the public site + admin panel. All old transactional data in the database will be wiped clean.

## Waiting on you

Please upload the **Hasan Travels logo screenshot** from the Facebook page in the next message. I'll proceed with the name change in parallel and apply colors after the upload.

---

## Scope of changes

### 1. Brand name swap (everywhere "TRIP TASTIC" appears)

Replace all visible occurrences of `TRIP TASTIC` / `TRIPTASTIC` / `Trip Tastic` with `Hasan Travels`:

- `index.html` — `<title>`, meta description, OG tags, twitter tags, canonical URL placeholder
- `src/components/Navbar.tsx`, `Footer.tsx`, `HeroSection.tsx`, `AboutSection.tsx`, `ContactSection.tsx`
- `src/pages/About.tsx`, `Contact.tsx`, `Auth.tsx`, `PrivacyPolicy.tsx`, `RefundPolicy.tsx`, `TermsConditions.tsx`, `UmrahGuide.tsx`
- `src/lib/pdfCompanyConfig.ts` — `DEFAULT_CONFIG` (company_name, footer text, email)
- `src/i18n/translations.ts` — both EN + BN strings
- `public/sitemap.xml`, `public/robots.txt`, `README.md`
- Any hardcoded `triptastic.com.bd` / `info@triptastic.com.bd` / phone numbers → leave as placeholders (e.g. `info@hasantravels.com`) since you said only name change for now

I'll grep the full repo to catch every instance.

### 2. Logo asset

- Save your uploaded screenshot as `src/assets/hasan-travels-logo.png`
- Wire it into `Navbar`, `Footer`, `HeroSection`, login page, PDF header (`pdfCore.ts`)
- Replace `public/og-image.jpg` and `public/placeholder.svg` references where appropriate

### 3. Theme colors (after logo upload)

I'll sample dominant colors from your logo and update the design system in:

- `src/index.css` — HSL CSS variables (`--primary`, `--secondary`, `--accent`, `--background`, etc.)
- `tailwind.config.ts` — extended palette tokens
- Ensure all components consume semantic tokens (no hardcoded colors leak)

Will produce a cohesive light + dark theme that visually matches the logo.

### 4. Database wipe (old transactional data)

Hard-delete all rows from operational tables (preserves schema, RLS, admin user, roles):

```text
bookings, booking_members, booking_documents, payments,
moallems, moallem_payments, moallem_commission_payments, moallem_items,
supplier_agents, supplier_agent_payments, supplier_agent_items,
supplier_contracts, supplier_contract_payments,
hotel_bookings, hotels, hotel_rooms,
ticket_bookings (+ related ticket tables), refunds, settlements, settlement_items,
expenses, daily_cashbook, financial_summary, online_payment_sessions,
notification_logs, audit_logs, profiles (non-admin only),
packages, blog_posts, cms_versions, site_content (reset to defaults),
company_settings (reset PDF config to Hasan Travels)
```

Preserved: `user_roles` (admin), `accounts` (chart of accounts), schema, triggers, RLS policies.

Order respects FK dependencies. Will run as one migration.

### 5. Admin panel branding

- Sidebar header, login screen, page titles, browser tab favicon
- Reset `company_settings.pdf_company` row so all generated PDFs/invoices use Hasan Travels

---

## Technical notes

- Project is server-rendered via the custom Node/Express backend (`server/index.js`) deployed on VPS — frontend changes will need a `git pull && npm run build && pm2 reload` on the VPS after merge (per your standard procedure memory).
- Bilingual (EN/BN) strings both updated.
- `pdfCompanyConfig` falls back to `DEFAULT_CONFIG` when `company_settings` row is missing — so updating both gives full coverage.
- Memory entries (`mem://style/brand-identity`, `mem://project/repository-management`) will be updated to reflect Hasan Travels.

---

## Ready when you are

Upload the logo screenshot and approve this plan — I'll then execute name swap + DB wipe immediately, and follow with logo wiring + theme colors.