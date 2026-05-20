-- =============================================================
-- Phase 2 Migration: Refunds + Accounting Hooks
-- Adds: refunds table, refund_status_history,
--       cancellation_policies, helper indexes.
-- Safe to run multiple times (uses IF NOT EXISTS where possible).
-- =============================================================

BEGIN;

-- -------------------------------------------------------------
-- 1. CANCELLATION POLICIES (used when calculating a refund)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cancellation_policies (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  description  TEXT,
  refund_type  TEXT NOT NULL DEFAULT 'percentage',  -- 'percentage' | 'flat'
  refund_value NUMERIC(14,2) NOT NULL DEFAULT 0,    -- 0-100 for percentage, BDT for flat
  min_days_before_departure INT DEFAULT 0,
  is_default   BOOLEAN NOT NULL DEFAULT false,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed sensible defaults (only if table is empty)
INSERT INTO cancellation_policies (name, description, refund_type, refund_value, is_default, is_active)
SELECT * FROM (VALUES
  ('Full refund',     'No deduction',                          'percentage', 100, true,  true),
  ('10% deduction',   'Standard cancellation fee',              'percentage',  90, false, true),
  ('25% deduction',   'Late cancellation',                      'percentage',  75, false, true),
  ('50% deduction',   'After processing started',               'percentage',  50, false, true),
  ('No refund',       'After service rendered',                 'percentage',   0, false, true)
) AS v(name, description, refund_type, refund_value, is_default, is_active)
WHERE NOT EXISTS (SELECT 1 FROM cancellation_policies);

-- -------------------------------------------------------------
-- 2. REFUNDS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS refunds (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id    UUID NOT NULL REFERENCES applications(id) ON DELETE RESTRICT,
  customer_id       UUID NOT NULL REFERENCES customers(id)    ON DELETE RESTRICT,
  policy_id         UUID REFERENCES cancellation_policies(id) ON DELETE SET NULL,
  original_amount   NUMERIC(14,2) NOT NULL DEFAULT 0,  -- paid_amount snapshot
  deduction_amount  NUMERIC(14,2) NOT NULL DEFAULT 0,
  refund_amount     NUMERIC(14,2) NOT NULL DEFAULT 0,
  method_code       TEXT REFERENCES payment_methods(code),
  wallet_id         UUID REFERENCES wallets(id),
  reason            TEXT,
  status            TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | rejected | cancelled
  requested_by      UUID,
  approved_by       UUID,
  approved_at       TIMESTAMPTZ,
  rejected_by       UUID,
  rejected_at       TIMESTAMPTZ,
  rejection_reason  TEXT,
  journal_entry_id  UUID REFERENCES journal_entries(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_refunds_app      ON refunds(application_id);
CREATE INDEX IF NOT EXISTS idx_refunds_customer ON refunds(customer_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status   ON refunds(status);

-- Updated_at trigger (reuses existing update_updated_at_column())
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'ua_refunds'
  ) THEN
    CREATE TRIGGER ua_refunds BEFORE UPDATE ON refunds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'ua_cancellation_policies'
  ) THEN
    CREATE TRIGGER ua_cancellation_policies BEFORE UPDATE ON cancellation_policies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- -------------------------------------------------------------
-- 3. REFUND STATUS HISTORY (audit trail)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS refund_status_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_id    UUID NOT NULL REFERENCES refunds(id) ON DELETE CASCADE,
  from_status  TEXT,
  to_status    TEXT NOT NULL,
  note         TEXT,
  changed_by   UUID,
  changed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_refundhist_refund ON refund_status_history(refund_id, changed_at DESC);

-- -------------------------------------------------------------
-- 4. Helpful index on agent_commissions by application
-- -------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_comm_application ON agent_commissions(application_id);

COMMIT;
