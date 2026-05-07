
-- ============================================================
-- 1. VALIDATION TRIGGERS
-- ============================================================

-- Block customer payment > booking total
CREATE OR REPLACE FUNCTION public.validate_payment_amount()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_total NUMERIC;
  v_already NUMERIC;
BEGIN
  IF NEW.booking_id IS NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(total_amount,0) INTO v_total FROM public.bookings WHERE id = NEW.booking_id;
  SELECT COALESCE(SUM(amount),0) INTO v_already
  FROM public.payments
  WHERE booking_id = NEW.booking_id
    AND status = 'completed'
    AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
  IF NEW.status = 'completed' AND (v_already + NEW.amount) > (v_total + 0.01) THEN
    RAISE EXCEPTION 'Customer payment % would exceed application total %. Already paid: %', NEW.amount, v_total, v_already;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_validate_payment_amount ON public.payments;
CREATE TRIGGER trg_validate_payment_amount BEFORE INSERT OR UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.validate_payment_amount();

-- Block supplier payment > supplier cost (only when booking_id present)
CREATE OR REPLACE FUNCTION public.validate_supplier_payment_amount()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cost NUMERIC;
  v_already NUMERIC;
BEGIN
  IF NEW.booking_id IS NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(total_cost,0) INTO v_cost FROM public.bookings WHERE id = NEW.booking_id;
  SELECT COALESCE(SUM(amount),0) INTO v_already
  FROM public.supplier_agent_payments
  WHERE booking_id = NEW.booking_id
    AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
  IF (v_already + NEW.amount) > (v_cost + 0.01) THEN
    RAISE EXCEPTION 'Supplier payment % would exceed supplier cost %. Already paid: %', NEW.amount, v_cost, v_already;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_validate_supplier_payment_amount ON public.supplier_agent_payments;
CREATE TRIGGER trg_validate_supplier_payment_amount BEFORE INSERT OR UPDATE ON public.supplier_agent_payments
FOR EACH ROW EXECUTE FUNCTION public.validate_supplier_payment_amount();

-- Block commission payment > total commission
CREATE OR REPLACE FUNCTION public.validate_commission_payment_amount()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_total NUMERIC;
  v_already NUMERIC;
BEGIN
  IF NEW.booking_id IS NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(total_commission,0) INTO v_total FROM public.bookings WHERE id = NEW.booking_id;
  SELECT COALESCE(SUM(amount),0) INTO v_already
  FROM public.moallem_commission_payments
  WHERE booking_id = NEW.booking_id
    AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
  IF (v_already + NEW.amount) > (v_total + 0.01) THEN
    RAISE EXCEPTION 'Commission payment % would exceed total commission %. Already paid: %', NEW.amount, v_total, v_already;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_validate_commission_payment_amount ON public.moallem_commission_payments;
CREATE TRIGGER trg_validate_commission_payment_amount BEFORE INSERT OR UPDATE ON public.moallem_commission_payments
FOR EACH ROW EXECUTE FUNCTION public.validate_commission_payment_amount();


-- ============================================================
-- 2. WALLET BALANCES VIEW (live, by payment method)
-- ============================================================

CREATE OR REPLACE VIEW public.wallet_balances AS
WITH inflows AS (
  SELECT wallet_account_id, SUM(amount) AS amt FROM public.payments WHERE status = 'completed' AND wallet_account_id IS NOT NULL GROUP BY wallet_account_id
  UNION ALL
  SELECT wallet_account_id, SUM(amount) FROM public.moallem_payments WHERE wallet_account_id IS NOT NULL GROUP BY wallet_account_id
  UNION ALL
  SELECT wallet_account_id, SUM(amount) FROM public.daily_cashbook WHERE type='income' AND wallet_account_id IS NOT NULL GROUP BY wallet_account_id
),
outflows AS (
  SELECT wallet_account_id, SUM(amount) AS amt FROM public.supplier_agent_payments WHERE wallet_account_id IS NOT NULL GROUP BY wallet_account_id
  UNION ALL
  SELECT wallet_account_id, SUM(amount) FROM public.moallem_commission_payments WHERE wallet_account_id IS NOT NULL GROUP BY wallet_account_id
  UNION ALL
  SELECT wallet_account_id, SUM(amount) FROM public.supplier_contract_payments WHERE wallet_account_id IS NOT NULL GROUP BY wallet_account_id
  UNION ALL
  SELECT wallet_account_id, SUM(amount) FROM public.expenses WHERE wallet_account_id IS NOT NULL GROUP BY wallet_account_id
  UNION ALL
  SELECT wallet_account_id, SUM(amount) FROM public.daily_cashbook WHERE type='expense' AND wallet_account_id IS NOT NULL GROUP BY wallet_account_id
  UNION ALL
  SELECT wallet_account_id, SUM(refund_amount) FROM public.refunds WHERE status='processed' AND wallet_account_id IS NOT NULL GROUP BY wallet_account_id
)
SELECT
  a.id AS account_id,
  a.name,
  COALESCE((SELECT SUM(amt) FROM inflows WHERE wallet_account_id = a.id), 0) AS total_in,
  COALESCE((SELECT SUM(amt) FROM outflows WHERE wallet_account_id = a.id), 0) AS total_out,
  COALESCE((SELECT SUM(amt) FROM inflows WHERE wallet_account_id = a.id), 0)
    - COALESCE((SELECT SUM(amt) FROM outflows WHERE wallet_account_id = a.id), 0) AS balance
FROM public.accounts a
WHERE a.type = 'asset';


-- ============================================================
-- 3. UNIFIED DASHBOARD KPI VIEW (Work Permit + Air Ticket + Visa)
-- ============================================================

CREATE OR REPLACE VIEW public.dashboard_kpis AS
WITH
  wp AS (
    SELECT
      COALESCE(SUM(total_amount), 0) AS sales,
      COALESCE(SUM(paid_amount), 0)  AS received,
      COALESCE(SUM(due_amount), 0)   AS due,
      COALESCE(SUM(total_cost), 0)   AS supplier_cost,
      COALESCE(SUM(supplier_due), 0) AS supplier_due,
      COALESCE(SUM(total_commission), 0) AS commission,
      COALESCE(SUM(commission_due), 0)   AS commission_due,
      COUNT(*) FILTER (WHERE service_type='work_permit') AS work_permit_count,
      COUNT(*) FILTER (WHERE service_type='visa')        AS visa_count_b,
      COUNT(*) FILTER (WHERE status='pending')   AS pending,
      COUNT(*) FILTER (WHERE status IN ('completed','confirmed')) AS completed,
      COUNT(*) FILTER (WHERE status='cancelled') AS cancelled,
      COUNT(*) AS total_apps
    FROM public.bookings WHERE status <> 'cancelled'
  ),
  tk AS (
    SELECT
      COALESCE(SUM(customer_billing_amount), 0) AS sales,
      COALESCE(SUM(received_amount), 0) AS received,
      COALESCE(SUM(customer_due), 0) AS due,
      COALESCE(SUM(our_cost), 0) AS supplier_cost,
      GREATEST(COALESCE(SUM(our_cost),0) - 0, 0) AS supplier_due,
      COUNT(*) AS ticket_count
    FROM public.ticket_bookings WHERE status <> 'cancelled'
  ),
  vs AS (
    SELECT
      COALESCE(SUM(billing_amount), 0) AS sales,
      COALESCE(SUM(received_amount), 0) AS received,
      COALESCE(SUM(customer_due), 0) AS due,
      COALESCE(SUM(our_cost), 0) AS supplier_cost,
      COUNT(*) AS visa_count
    FROM public.visa_applications WHERE status <> 'cancelled'
  ),
  ex AS ( SELECT COALESCE(SUM(amount),0) AS total FROM public.expenses ),
  rf AS ( SELECT COALESCE(SUM(refund_amount),0) AS total FROM public.refunds WHERE status='processed' ),
  cust AS (
    SELECT COUNT(*) AS total FROM public.profiles
  )
SELECT
  -- Sales & income
  (wp.sales + tk.sales + vs.sales)         AS total_sales,
  (wp.received + tk.received + vs.received) AS income_received,
  (wp.due + tk.due + vs.due)               AS customer_due,

  -- Supplier & commission
  (wp.supplier_cost + tk.supplier_cost + vs.supplier_cost) AS supplier_cost,
  wp.supplier_due AS supplier_due,
  wp.commission   AS commission_total,
  wp.commission_due AS commission_due,

  -- Expenses & refunds
  ex.total  AS expenses,
  rf.total  AS refunds,

  -- Net profit (sales - supplier cost - commission - expenses - refunds)
  ((wp.sales + tk.sales + vs.sales)
   - (wp.supplier_cost + tk.supplier_cost + vs.supplier_cost)
   - wp.commission - ex.total - rf.total) AS net_profit,

  -- Quick stats
  cust.total AS total_customers,
  wp.work_permit_count,
  (wp.visa_count_b + vs.visa_count) AS visa_count,
  tk.ticket_count,
  wp.pending,
  wp.completed,
  wp.cancelled,
  wp.total_apps
FROM wp, tk, vs, ex, rf, cust;


-- ============================================================
-- 4. MASTER RECALCULATION FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.recalculate_all_financials()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_kpis RECORD;
  v_walletcount INT;
BEGIN
  -- 1. Recompute booking paid_amount / due_amount / supplier_due / commission_due
  UPDATE public.bookings b
  SET paid_amount  = COALESCE(p.paid, 0),
      due_amount   = GREATEST(0, b.total_amount - COALESCE(p.paid, 0)),
      paid_to_supplier = COALESCE(s.paid, 0),
      supplier_due = GREATEST(0, b.total_cost - COALESCE(s.paid, 0)),
      commission_paid = COALESCE(c.paid, 0),
      commission_due  = GREATEST(0, b.total_commission - COALESCE(c.paid, 0))
  FROM (SELECT booking_id, SUM(amount) AS paid FROM public.payments WHERE status='completed' GROUP BY booking_id) p
  FULL OUTER JOIN (SELECT booking_id, SUM(amount) AS paid FROM public.supplier_agent_payments GROUP BY booking_id) s USING (booking_id)
  FULL OUTER JOIN (SELECT booking_id, SUM(amount) AS paid FROM public.moallem_commission_payments GROUP BY booking_id) c USING (booking_id)
  WHERE b.id = COALESCE(p.booking_id, s.booking_id, c.booking_id);

  -- 2. Recompute moallem totals
  UPDATE public.moallems m
  SET total_deposit = COALESCE(d.dep, 0),
      total_due = GREATEST(0, COALESCE(b.total, 0) - COALESCE(b.paid, 0))
  FROM (SELECT moallem_id, SUM(amount) AS dep FROM public.moallem_payments GROUP BY moallem_id) d
  FULL OUTER JOIN (
    SELECT moallem_id, SUM(total_amount) AS total, SUM(paid_amount) AS paid
    FROM public.bookings WHERE moallem_id IS NOT NULL AND status <> 'cancelled' GROUP BY moallem_id
  ) b USING (moallem_id)
  WHERE m.id = COALESCE(d.moallem_id, b.moallem_id);

  -- 3. Recompute wallet balances from wallet_balances view
  UPDATE public.accounts a
  SET balance = wb.balance, updated_at = now()
  FROM public.wallet_balances wb
  WHERE a.id = wb.account_id;

  GET DIAGNOSTICS v_walletcount = ROW_COUNT;

  -- 4. Refresh financial_summary
  SELECT * INTO v_kpis FROM public.dashboard_kpis;

  IF EXISTS (SELECT 1 FROM public.financial_summary LIMIT 1) THEN
    UPDATE public.financial_summary
    SET total_income = v_kpis.income_received,
        total_expense = v_kpis.expenses + v_kpis.supplier_cost + v_kpis.commission_total + v_kpis.refunds,
        net_profit = v_kpis.net_profit,
        updated_at = now()
    WHERE id IS NOT NULL;
  ELSE
    INSERT INTO public.financial_summary (total_income, total_expense, net_profit)
    VALUES (v_kpis.income_received,
            v_kpis.expenses + v_kpis.supplier_cost + v_kpis.commission_total + v_kpis.refunds,
            v_kpis.net_profit);
  END IF;

  RETURN jsonb_build_object(
    'wallets_updated', v_walletcount,
    'total_sales', v_kpis.total_sales,
    'income_received', v_kpis.income_received,
    'customer_due', v_kpis.customer_due,
    'supplier_due', v_kpis.supplier_due,
    'commission_due', v_kpis.commission_due,
    'expenses', v_kpis.expenses,
    'refunds', v_kpis.refunds,
    'net_profit', v_kpis.net_profit,
    'recalculated_at', now()
  );
END; $$;

GRANT EXECUTE ON FUNCTION public.recalculate_all_financials() TO authenticated;
GRANT SELECT ON public.dashboard_kpis TO authenticated;
GRANT SELECT ON public.wallet_balances TO authenticated;
