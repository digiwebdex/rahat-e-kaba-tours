-- =============================================================
-- AL RAWSHA INTERNATIONAL — PHASE 1 REBUILD
-- Wipes Hajj/Umrah business schema, creates new Recruiting schema
-- Services: Overseas Work Permit | Air Ticket | Visa
-- Run on VPS:
--   psql "postgresql://alrawsha_user:...@127.0.0.1:5440/alrawsha" \
--     -f /var/www/alrawsha/server/migrations/20260519_phase1_recruiting_rebuild.sql
-- =============================================================

BEGIN;

-- ============================================================
-- 1. DROP OLD BUSINESS TABLES (keep auth, profiles, audit, etc.)
-- ============================================================
DROP TABLE IF EXISTS settlement_items CASCADE;
DROP TABLE IF EXISTS settlements CASCADE;
DROP TABLE IF EXISTS service_payments CASCADE;
DROP TABLE IF EXISTS supplier_contract_payments CASCADE;
DROP TABLE IF EXISTS supplier_contracts CASCADE;
DROP TABLE IF EXISTS supplier_agent_payments CASCADE;
DROP TABLE IF EXISTS supplier_agent_items CASCADE;
DROP TABLE IF EXISTS supplier_agents CASCADE;
DROP TABLE IF EXISTS moallem_commission_payments CASCADE;
DROP TABLE IF EXISTS moallem_payments CASCADE;
DROP TABLE IF EXISTS moallem_items CASCADE;
DROP TABLE IF EXISTS moallems CASCADE;
DROP TABLE IF EXISTS hotel_bookings CASCADE;
DROP TABLE IF EXISTS hotel_rooms CASCADE;
DROP TABLE IF EXISTS hotels CASCADE;
DROP TABLE IF EXISTS booking_documents CASCADE;
DROP TABLE IF EXISTS booking_members CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS installment_plans CASCADE;
DROP TABLE IF EXISTS cancellation_policies CASCADE;
DROP TABLE IF EXISTS refunds CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS packages CASCADE;
DROP TABLE IF EXISTS online_payment_sessions CASCADE;
DROP TABLE IF EXISTS daily_cashbook CASCADE;
DROP TABLE IF EXISTS financial_summary CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS site_content CASCADE;
DROP TABLE IF EXISTS cms_versions CASCADE;
DROP TABLE IF EXISTS blog_posts CASCADE;

-- Keep: profiles, user_roles, audit_logs, notification_logs,
-- notification_settings, company_settings, admin_2fa, admin_2fa_codes, otp_codes

-- ============================================================
-- 2. EXTEND ROLE ENUM
-- ============================================================
DO $$ BEGIN
  ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'booking_officer';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'referral_agent';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'supplier_agent';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'customer';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 3. CORE CATALOG: services + packages
-- ============================================================
CREATE TABLE services (
  code        TEXT PRIMARY KEY,           -- 'work_permit' | 'air_ticket' | 'visa'
  name_en     TEXT NOT NULL,
  name_bn     TEXT,
  description TEXT,
  icon        TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO services (code, name_en, name_bn, sort_order) VALUES
  ('work_permit', 'Overseas Work Permit', 'বিদেশে কাজের ভিসা', 1),
  ('air_ticket',  'Air Ticket',           'বিমান টিকেট',       2),
  ('visa',        'Visa Processing',      'ভিসা প্রসেসিং',     3);

CREATE TABLE service_packages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_code    TEXT NOT NULL REFERENCES services(code) ON DELETE RESTRICT,
  country         TEXT,
  country_code    TEXT,                          -- ISO2 for flag
  title           TEXT NOT NULL,
  subtitle        TEXT,
  description     TEXT,
  base_price      NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'BDT',
  image_url       TEXT,
  details         JSONB NOT NULL DEFAULT '{}'::jsonb,
  features        JSONB NOT NULL DEFAULT '[]'::jsonb,
  highlight_tag   TEXT,
  rating          NUMERIC(3,2) DEFAULT 4.9,
  status          TEXT NOT NULL DEFAULT 'active', -- active | inactive | deleted
  show_on_website BOOLEAN NOT NULL DEFAULT true,
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_packages_service_country ON service_packages(service_code, country);
CREATE INDEX idx_packages_visible ON service_packages(show_on_website, status);

-- ============================================================
-- 4. CUSTOMERS (single source of truth)
-- ============================================================
CREATE TABLE customers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID UNIQUE,                   -- nullable for guest
  full_name       TEXT NOT NULL,
  phone           TEXT NOT NULL,
  email           TEXT,
  nid_number      TEXT,
  passport_number TEXT,
  date_of_birth   DATE,
  address         TEXT,
  city            TEXT,
  emergency_contact TEXT,
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'active', -- active | inactive | deleted
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_customers_phone_active
  ON customers(phone) WHERE status <> 'deleted';
CREATE INDEX idx_customers_user ON customers(user_id);

-- ============================================================
-- 5. AGENTS (referral + supplier, unified table with kind)
-- ============================================================
CREATE TABLE agents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID UNIQUE,
  kind             TEXT NOT NULL,             -- 'referral' | 'supplier'
  name             TEXT NOT NULL,
  company_name     TEXT,
  phone            TEXT,
  email            TEXT,
  country          TEXT,                       -- supplier mainly
  address          TEXT,
  service_codes    TEXT[] DEFAULT '{}',        -- which services they handle
  commission_type  TEXT DEFAULT 'flat',        -- 'flat' | 'percent' (referral only)
  commission_value NUMERIC(14,2) DEFAULT 0,
  notes            TEXT,
  status           TEXT NOT NULL DEFAULT 'active',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_agents_kind_status ON agents(kind, status);

-- ============================================================
-- 6. APPLICATIONS (the core booking entity)
-- ============================================================
CREATE OR REPLACE FUNCTION gen_tracking_id() RETURNS TEXT AS $$
  SELECT 'TT-' || upper(substr(replace(gen_random_uuid()::text,'-',''), 1, 8));
$$ LANGUAGE sql VOLATILE;

CREATE TABLE applications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id       TEXT UNIQUE NOT NULL DEFAULT gen_tracking_id(),
  service_code      TEXT NOT NULL REFERENCES services(code),
  package_id        UUID REFERENCES service_packages(id) ON DELETE SET NULL,
  customer_id       UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  referral_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  supplier_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  application_data  JSONB NOT NULL DEFAULT '{}'::jsonb,  -- service-specific fields
  total_amount      NUMERIC(14,2) NOT NULL DEFAULT 0,
  paid_amount       NUMERIC(14,2) NOT NULL DEFAULT 0,
  due_amount        NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount          NUMERIC(14,2) NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'submitted',
    -- draft|submitted|under_review|approved|processing|deployed|completed|rejected|cancelled
  source            TEXT NOT NULL DEFAULT 'website',     -- website|admin|agent
  notes             TEXT,
  created_by        UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_app_customer ON applications(customer_id);
CREATE INDEX idx_app_service_status ON applications(service_code, status);
CREATE INDEX idx_app_ref_agent ON applications(referral_agent_id);
CREATE INDEX idx_app_sup_agent ON applications(supplier_agent_id);
CREATE INDEX idx_app_created ON applications(created_at DESC);

CREATE TABLE application_documents (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  doc_type       TEXT NOT NULL,    -- passport|photo|nid|education|experience|other
  file_name      TEXT NOT NULL,
  file_path      TEXT NOT NULL,
  file_size      INT,
  mime_type      TEXT,
  uploaded_by    UUID,
  verified       BOOLEAN NOT NULL DEFAULT false,
  verified_by    UUID,
  verified_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_appdoc_app ON application_documents(application_id);

CREATE TABLE application_status_history (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  from_status    TEXT,
  to_status      TEXT NOT NULL,
  note           TEXT,
  changed_by     UUID,
  changed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_apphist_app ON application_status_history(application_id, changed_at DESC);

-- ============================================================
-- 7. PAYMENT SYSTEM
-- ============================================================
CREATE TABLE wallets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  type        TEXT NOT NULL,    -- cash | bank | mobile
  account_no  TEXT,
  balance     NUMERIC(14,2) NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO wallets (name, type, sort_order) VALUES
  ('Office Cash', 'cash', 1),
  ('bKash Merchant', 'mobile', 2),
  ('Nagad Merchant', 'mobile', 3),
  ('Company Bank', 'bank', 4);

CREATE TABLE payment_methods (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT UNIQUE NOT NULL,           -- cash|bkash|nagad|bank|sslcommerz
  name            TEXT NOT NULL,
  type            TEXT NOT NULL,                  -- cash|mobile|bank|gateway
  wallet_id       UUID REFERENCES wallets(id),
  requires_proof  BOOLEAN NOT NULL DEFAULT false,
  is_online       BOOLEAN NOT NULL DEFAULT false,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  config          JSONB DEFAULT '{}'::jsonb,
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO payment_methods (code, name, type, requires_proof, is_online, sort_order) VALUES
  ('cash',        'Cash',              'cash',    false, false, 1),
  ('bkash',       'bKash',             'mobile',  true,  false, 2),
  ('nagad',       'Nagad',             'mobile',  true,  false, 3),
  ('bank',        'Bank Transfer',     'bank',    true,  false, 4),
  ('sslcommerz',  'Online (Card/Mobile Banking)', 'gateway', false, true, 5);

CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  UUID NOT NULL REFERENCES applications(id) ON DELETE RESTRICT,
  customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  amount          NUMERIC(14,2) NOT NULL,
  method_code     TEXT NOT NULL REFERENCES payment_methods(code),
  wallet_id       UUID REFERENCES wallets(id),
  transaction_ref TEXT,
  proof_file_path TEXT,
  status          TEXT NOT NULL DEFAULT 'pending', -- pending | verified | rejected
  verified_by     UUID,
  verified_at     TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ,
  notes           TEXT,
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pay_app ON payments(application_id);
CREATE INDEX idx_pay_customer ON payments(customer_id);
CREATE INDEX idx_pay_status ON payments(status);

CREATE TABLE online_payment_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tran_id         TEXT UNIQUE NOT NULL,
  application_id  UUID REFERENCES applications(id) ON DELETE SET NULL,
  customer_id     UUID REFERENCES customers(id),
  payment_id      UUID REFERENCES payments(id),
  amount          NUMERIC(14,2) NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'BDT',
  gateway         TEXT NOT NULL DEFAULT 'sslcommerz',
  status          TEXT NOT NULL DEFAULT 'initiated',
  gateway_response JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Recalculate application paid/due on payment verify
CREATE OR REPLACE FUNCTION recalc_application_payments() RETURNS trigger AS $$
DECLARE app_id UUID;
BEGIN
  app_id := COALESCE(NEW.application_id, OLD.application_id);
  UPDATE applications a SET
    paid_amount = COALESCE((SELECT SUM(amount) FROM payments
                            WHERE application_id = app_id AND status='verified'), 0),
    due_amount  = GREATEST(0, a.total_amount - COALESCE((SELECT SUM(amount) FROM payments
                            WHERE application_id = app_id AND status='verified'), 0)),
    updated_at  = now()
  WHERE a.id = app_id;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recalc_app_payments
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW EXECUTE FUNCTION recalc_application_payments();

-- ============================================================
-- 8. ACCOUNTING (double-entry foundation, expanded in Phase 3)
-- ============================================================
CREATE TABLE chart_of_accounts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL,    -- asset|liability|income|expense|equity
  parent_id   UUID REFERENCES chart_of_accounts(id),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO chart_of_accounts (code, name, type) VALUES
  ('1000', 'Cash & Bank',            'asset'),
  ('1100', 'Accounts Receivable',    'asset'),
  ('2000', 'Accounts Payable',       'liability'),
  ('2100', 'Agent Commission Payable','liability'),
  ('2200', 'Supplier Payable',       'liability'),
  ('3000', 'Owner Equity',           'equity'),
  ('4000', 'Work Permit Revenue',    'income'),
  ('4100', 'Air Ticket Revenue',     'income'),
  ('4200', 'Visa Revenue',           'income'),
  ('5000', 'Operating Expenses',     'expense'),
  ('5100', 'Agent Commission Expense','expense'),
  ('5200', 'Supplier Cost',          'expense'),
  ('5300', 'Refunds',                'expense');

CREATE TABLE journal_entries (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  ref_type     TEXT,           -- 'payment'|'expense'|'commission'|'refund'|'manual'
  ref_id       UUID,
  description  TEXT,
  total_debit  NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_credit NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_by   UUID,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_journal_date ON journal_entries(entry_date DESC);
CREATE INDEX idx_journal_ref ON journal_entries(ref_type, ref_id);

CREATE TABLE journal_lines (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id    UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id  UUID NOT NULL REFERENCES chart_of_accounts(id),
  wallet_id   UUID REFERENCES wallets(id),
  debit       NUMERIC(14,2) NOT NULL DEFAULT 0,
  credit      NUMERIC(14,2) NOT NULL DEFAULT 0,
  description TEXT
);
CREATE INDEX idx_jline_entry ON journal_lines(entry_id);
CREATE INDEX idx_jline_account ON journal_lines(account_id);
CREATE INDEX idx_jline_wallet ON journal_lines(wallet_id);

-- Wallet balance auto-recalc
CREATE OR REPLACE FUNCTION recalc_wallet_balance() RETURNS trigger AS $$
DECLARE w_id UUID;
BEGIN
  w_id := COALESCE(NEW.wallet_id, OLD.wallet_id);
  IF w_id IS NULL THEN RETURN NEW; END IF;
  UPDATE wallets SET balance = COALESCE(
    (SELECT SUM(debit - credit) FROM journal_lines WHERE wallet_id = w_id), 0)
  WHERE id = w_id;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_wallet_balance
AFTER INSERT OR UPDATE OR DELETE ON journal_lines
FOR EACH ROW EXECUTE FUNCTION recalc_wallet_balance();

CREATE TABLE expenses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category    TEXT NOT NULL,
  amount      NUMERIC(14,2) NOT NULL,
  wallet_id   UUID REFERENCES wallets(id),
  vendor      TEXT,
  note        TEXT,
  attachment_path TEXT,
  created_by  UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE agent_commissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id        UUID NOT NULL REFERENCES agents(id) ON DELETE RESTRICT,
  application_id  UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  amount          NUMERIC(14,2) NOT NULL,
  status          TEXT NOT NULL DEFAULT 'accrued', -- accrued | paid | cancelled
  paid_at         TIMESTAMPTZ,
  payment_id      UUID,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_comm_agent ON agent_commissions(agent_id, status);

CREATE TABLE supplier_payables (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE RESTRICT,
  application_id    UUID REFERENCES applications(id) ON DELETE SET NULL,
  amount_due        NUMERIC(14,2) NOT NULL DEFAULT 0,
  amount_paid       NUMERIC(14,2) NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'open',  -- open | partial | settled
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE supplier_settlements (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payable_id        UUID NOT NULL REFERENCES supplier_payables(id) ON DELETE CASCADE,
  amount            NUMERIC(14,2) NOT NULL,
  wallet_id         UUID REFERENCES wallets(id),
  payment_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_path      TEXT,
  notes             TEXT,
  created_by        UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 9. CMS — full frontend content control
-- ============================================================
CREATE TABLE cms_sections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page        TEXT NOT NULL,            -- home|about|services|contact|footer|global
  section_key TEXT NOT NULL,            -- hero|why_us|process|countries|cta|...
  content     JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_visible  BOOLEAN NOT NULL DEFAULT true,
  sort_order  INT NOT NULL DEFAULT 0,
  updated_by  UUID,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (page, section_key)
);
CREATE INDEX idx_cms_page ON cms_sections(page, sort_order);

CREATE TABLE cms_versions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id  UUID NOT NULL REFERENCES cms_sections(id) ON DELETE CASCADE,
  content     JSONB NOT NULL,
  note        TEXT,
  edited_by   UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cmsv_section ON cms_versions(section_id, created_at DESC);

CREATE TABLE menu_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label_en    TEXT NOT NULL,
  label_bn    TEXT,
  href        TEXT NOT NULL,
  parent_id   UUID REFERENCES menu_items(id) ON DELETE CASCADE,
  is_visible  BOOLEAN NOT NULL DEFAULT true,
  sort_order  INT NOT NULL DEFAULT 0,
  target      TEXT DEFAULT '_self',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO menu_items (label_en, label_bn, href, sort_order) VALUES
  ('Home',          'হোম',                 '/',                 1),
  ('Work Permit',   'ওভারসিজ ওয়ার্ক পারমিট', '/services/work-permit', 2),
  ('Air Ticket',    'বিমান টিকেট',         '/services/air-ticket', 3),
  ('Visa',          'ভিসা',                '/services/visa',     4),
  ('About',         'আমাদের সম্পর্কে',     '/about',            5),
  ('Contact',       'যোগাযোগ',             '/contact',          6);

CREATE TABLE site_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by  UUID,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO site_settings (key, value) VALUES
  ('brand',    '{"name":"Al Rawsha International","logo":"","favicon":"","tagline":"Your Gateway to Global Opportunities"}'::jsonb),
  ('contact',  '{"phone":"","whatsapp":"","email":"","address":"","map_embed":""}'::jsonb),
  ('social',   '{"facebook":"","youtube":"","instagram":"","linkedin":"","tiktok":""}'::jsonb),
  ('seo',      '{"title":"Al Rawsha International","description":"Overseas Work Permit, Air Ticket, Visa","keywords":"work permit, visa, air ticket","og_image":""}'::jsonb),
  ('hero',     '{"headline":"","subheadline":"","cta_text":"","cta_link":"","bg_image":""}'::jsonb);

-- Seed CMS sections (empty content, admin fills in)
INSERT INTO cms_sections (page, section_key, sort_order) VALUES
  ('home', 'hero',        1),
  ('home', 'services',    2),
  ('home', 'why_us',      3),
  ('home', 'countries',   4),
  ('home', 'process',     5),
  ('home', 'testimonials',6),
  ('home', 'cta',         7),
  ('home', 'faq',         8),
  ('about','intro',       1),
  ('about','mission',     2),
  ('about','team',        3),
  ('contact','info',      1),
  ('contact','form',      2),
  ('footer','about',      1),
  ('footer','links',      2),
  ('footer','contact',    3);

CREATE TABLE blog_posts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  slug         TEXT UNIQUE NOT NULL,
  excerpt      TEXT,
  content      TEXT NOT NULL DEFAULT '',
  image_url    TEXT,
  tags         TEXT[] DEFAULT '{}',
  status       TEXT NOT NULL DEFAULT 'draft',
  author_id    UUID,
  published_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 10. UPDATED_AT TRIGGERS (reuse update_updated_at_column)
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname='update_updated_at_column') THEN
    CREATE FUNCTION update_updated_at_column() RETURNS trigger AS $f$
    BEGIN NEW.updated_at = now(); RETURN NEW; END $f$ LANGUAGE plpgsql;
  END IF;
END $$;

CREATE TRIGGER ua_packages   BEFORE UPDATE ON service_packages    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER ua_customers  BEFORE UPDATE ON customers           FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER ua_agents     BEFORE UPDATE ON agents              FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER ua_apps       BEFORE UPDATE ON applications        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER ua_supplpay   BEFORE UPDATE ON supplier_payables   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER ua_cms        BEFORE UPDATE ON cms_sections        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER ua_settings   BEFORE UPDATE ON site_settings       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER ua_blog       BEFORE UPDATE ON blog_posts          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER ua_onlinepay  BEFORE UPDATE ON online_payment_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- =============================================================
-- VERIFY:
--   SELECT code, name_en FROM services;
--   SELECT page, section_key FROM cms_sections ORDER BY page, sort_order;
--   SELECT code, name FROM payment_methods;
--   SELECT name, type, balance FROM wallets;
-- =============================================================