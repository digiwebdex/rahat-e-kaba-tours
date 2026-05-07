
-- Wipe transactional data (preserve users, roles, settings, CMS)
TRUNCATE TABLE
  public.payments,
  public.booking_documents,
  public.booking_members,
  public.refunds,
  public.expenses,
  public.moallem_payments,
  public.moallem_commission_payments,
  public.moallem_items,
  public.supplier_agent_payments,
  public.supplier_agent_items,
  public.supplier_contract_payments,
  public.supplier_contracts,
  public.settlement_items,
  public.settlements,
  public.daily_cashbook,
  public.notification_logs,
  public.online_payment_sessions,
  public.hotel_bookings,
  public.bookings
RESTART IDENTITY CASCADE;

DELETE FROM public.moallems WHERE id IS NOT NULL;
DELETE FROM public.supplier_agents WHERE id IS NOT NULL;
DELETE FROM public.packages WHERE id IS NOT NULL;
DELETE FROM public.hotel_rooms WHERE id IS NOT NULL;
DELETE FROM public.hotels WHERE id IS NOT NULL;

-- Reset wallet balances and financial summary
UPDATE public.accounts SET balance = 0, updated_at = now() WHERE id IS NOT NULL;
UPDATE public.financial_summary SET total_income = 0, total_expense = 0, net_profit = 0, updated_at = now() WHERE id IS NOT NULL;

-- Truncate transactions ledger (separate because it may have FKs)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='transactions') THEN
    EXECUTE 'TRUNCATE TABLE public.transactions RESTART IDENTITY CASCADE';
  END IF;
END $$;

-- Add service_type column to bookings (now: applications)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS service_type TEXT NOT NULL DEFAULT 'other';

-- Add service_type to supplier_agents
ALTER TABLE public.supplier_agents
  ADD COLUMN IF NOT EXISTS service_type TEXT DEFAULT 'multiple',
  ADD COLUMN IF NOT EXISTS country TEXT;

-- Middleman commission settings (moallems table reused as middlemen)
ALTER TABLE public.moallems
  ADD COLUMN IF NOT EXISTS commission_type TEXT DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS commission_value NUMERIC NOT NULL DEFAULT 0;

-- Index for service_type filtering
CREATE INDEX IF NOT EXISTS idx_bookings_service_type ON public.bookings(service_type);
CREATE INDEX IF NOT EXISTS idx_supplier_agents_service_type ON public.supplier_agents(service_type);
