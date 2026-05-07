
-- =========================================================
-- service_payments: unified receipts for Air Tickets & Visa
-- =========================================================
CREATE TABLE IF NOT EXISTS public.service_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type text NOT NULL CHECK (service_type IN ('air_ticket','visa')),
  service_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  payment_method text NOT NULL DEFAULT 'cash',
  wallet_account_id uuid NOT NULL REFERENCES public.accounts(id),
  transaction_ref text,
  receipt_file_path text,
  notes text,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_payments_service ON public.service_payments(service_type, service_id);
CREATE INDEX IF NOT EXISTS idx_service_payments_wallet ON public.service_payments(wallet_account_id);
CREATE INDEX IF NOT EXISTS idx_service_payments_date ON public.service_payments(payment_date);

ALTER TABLE public.service_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage service payments"
  ON public.service_payments FOR ALL
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Staff view service payments"
  ON public.service_payments FOR SELECT
  USING (
    has_role(auth.uid(),'admin'::app_role) OR
    has_role(auth.uid(),'manager'::app_role) OR
    has_role(auth.uid(),'accountant'::app_role) OR
    has_role(auth.uid(),'staff'::app_role) OR
    has_role(auth.uid(),'viewer'::app_role)
  );

-- =========================================================
-- Validation: payment must not exceed remaining due
-- =========================================================
CREATE OR REPLACE FUNCTION public.validate_service_payment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_billing numeric := 0;
  v_received numeric := 0;
  v_remaining numeric := 0;
BEGIN
  IF NEW.service_type = 'air_ticket' THEN
    SELECT COALESCE(customer_billing_amount,0), COALESCE(received_amount,0)
      INTO v_billing, v_received
      FROM public.ticket_bookings WHERE id = NEW.service_id;
  ELSIF NEW.service_type = 'visa' THEN
    SELECT COALESCE(billing_amount,0), COALESCE(received_amount,0)
      INTO v_billing, v_received
      FROM public.visa_applications WHERE id = NEW.service_id;
  END IF;

  IF v_billing = 0 THEN
    RAISE EXCEPTION 'Service record not found for %/% ', NEW.service_type, NEW.service_id;
  END IF;

  v_remaining := v_billing - v_received;
  IF TG_OP = 'UPDATE' THEN
    v_remaining := v_remaining + COALESCE(OLD.amount,0);
  END IF;

  IF NEW.amount > v_remaining + 0.01 THEN
    RAISE EXCEPTION 'Payment % exceeds remaining customer due %', NEW.amount, v_remaining;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_service_payment ON public.service_payments;
CREATE TRIGGER trg_validate_service_payment
  BEFORE INSERT OR UPDATE ON public.service_payments
  FOR EACH ROW EXECUTE FUNCTION public.validate_service_payment();

-- =========================================================
-- After service_payment: ledger + wallet + parent receipts
-- =========================================================
CREATE OR REPLACE FUNCTION public.apply_service_payment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_delta numeric;
  v_wallet uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_delta := NEW.amount;
    v_wallet := NEW.wallet_account_id;
  ELSIF TG_OP = 'UPDATE' THEN
    v_delta := NEW.amount - COALESCE(OLD.amount,0);
    v_wallet := NEW.wallet_account_id;
    IF OLD.wallet_account_id <> NEW.wallet_account_id THEN
      UPDATE public.accounts SET balance = balance - OLD.amount, updated_at = now()
        WHERE id = OLD.wallet_account_id;
      UPDATE public.accounts SET balance = balance + NEW.amount, updated_at = now()
        WHERE id = NEW.wallet_account_id;
      v_delta := 0;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_delta := -OLD.amount;
    v_wallet := OLD.wallet_account_id;
  END IF;

  IF v_delta <> 0 THEN
    UPDATE public.accounts SET balance = balance + v_delta, updated_at = now()
      WHERE id = v_wallet;
  END IF;

  -- Update parent service totals
  IF TG_OP = 'DELETE' THEN
    IF OLD.service_type = 'air_ticket' THEN
      UPDATE public.ticket_bookings
        SET received_amount = GREATEST(COALESCE(received_amount,0) - OLD.amount, 0),
            customer_due    = GREATEST(COALESCE(customer_billing_amount,0) - (COALESCE(received_amount,0) - OLD.amount), 0),
            payment_status  = CASE WHEN COALESCE(received_amount,0) - OLD.amount >= COALESCE(customer_billing_amount,0) THEN 'paid'
                                   WHEN COALESCE(received_amount,0) - OLD.amount > 0 THEN 'partial' ELSE 'due' END,
            updated_at      = now()
        WHERE id = OLD.service_id;
    ELSE
      UPDATE public.visa_applications
        SET received_amount = GREATEST(COALESCE(received_amount,0) - OLD.amount, 0),
            customer_due    = GREATEST(COALESCE(billing_amount,0) - (COALESCE(received_amount,0) - OLD.amount), 0),
            payment_status  = CASE WHEN COALESCE(received_amount,0) - OLD.amount >= COALESCE(billing_amount,0) THEN 'paid'
                                   WHEN COALESCE(received_amount,0) - OLD.amount > 0 THEN 'partial' ELSE 'due' END,
            updated_at      = now()
        WHERE id = OLD.service_id;
    END IF;
  ELSE
    IF NEW.service_type = 'air_ticket' THEN
      UPDATE public.ticket_bookings tb
        SET received_amount = COALESCE((SELECT SUM(amount) FROM public.service_payments WHERE service_type='air_ticket' AND service_id=tb.id),0),
            updated_at = now()
        WHERE id = NEW.service_id;
      UPDATE public.ticket_bookings
        SET customer_due = GREATEST(COALESCE(customer_billing_amount,0) - COALESCE(received_amount,0), 0),
            payment_status = CASE WHEN received_amount >= customer_billing_amount THEN 'paid'
                                  WHEN received_amount > 0 THEN 'partial' ELSE 'due' END
        WHERE id = NEW.service_id;
    ELSE
      UPDATE public.visa_applications va
        SET received_amount = COALESCE((SELECT SUM(amount) FROM public.service_payments WHERE service_type='visa' AND service_id=va.id),0),
            updated_at = now()
        WHERE id = NEW.service_id;
      UPDATE public.visa_applications
        SET customer_due = GREATEST(COALESCE(billing_amount,0) - COALESCE(received_amount,0), 0),
            payment_status = CASE WHEN received_amount >= billing_amount THEN 'paid'
                                  WHEN received_amount > 0 THEN 'partial' ELSE 'due' END
        WHERE id = NEW.service_id;
    END IF;
  END IF;

  -- Master ledger entries
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.transactions(type, category, amount, credit, debit, payment_method, source_type, source_id, reference, note, date, user_id)
    VALUES ('income', NEW.service_type, NEW.amount, NEW.amount, 0, NEW.payment_method, NEW.service_type||'_payment', NEW.id,
            NEW.transaction_ref, NEW.notes, NEW.payment_date, COALESCE(NEW.recorded_by, '00000000-0000-0000-0000-000000000000'::uuid));
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.transactions WHERE source_type = OLD.service_type||'_payment' AND source_id = OLD.id;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.transactions
       SET amount = NEW.amount, credit = NEW.amount, payment_method = NEW.payment_method,
           reference = NEW.transaction_ref, note = NEW.notes, date = NEW.payment_date
     WHERE source_type = NEW.service_type||'_payment' AND source_id = NEW.id;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_service_payment ON public.service_payments;
CREATE TRIGGER trg_apply_service_payment
  AFTER INSERT OR UPDATE OR DELETE ON public.service_payments
  FOR EACH ROW EXECUTE FUNCTION public.apply_service_payment();

-- =========================================================
-- Negative wallet balance guard (with override flag)
-- =========================================================
CREATE OR REPLACE FUNCTION public.guard_negative_wallet()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_allow boolean := false;
BEGIN
  IF NEW.balance < 0 THEN
    SELECT COALESCE((setting_value->>'allow_negative_wallet')::boolean, false) INTO v_allow
      FROM public.company_settings WHERE setting_key='financial_rules' LIMIT 1;
    IF NOT v_allow THEN
      RAISE EXCEPTION 'Wallet "%" balance cannot go negative (current attempt: %). Enable override in company settings to bypass.', NEW.name, NEW.balance;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_negative_wallet ON public.accounts;
CREATE TRIGGER trg_guard_negative_wallet
  BEFORE UPDATE OF balance ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.guard_negative_wallet();

-- =========================================================
-- Refund validation: completed refunds need method + wallet
-- =========================================================
CREATE OR REPLACE FUNCTION public.validate_refund_completion()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.status IN ('completed','approved') THEN
    IF NEW.refund_method IS NULL OR NEW.wallet_account_id IS NULL THEN
      RAISE EXCEPTION 'Completed refund requires payment method and wallet account';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_refund_completion ON public.refunds;
CREATE TRIGGER trg_validate_refund_completion
  BEFORE INSERT OR UPDATE ON public.refunds
  FOR EACH ROW EXECUTE FUNCTION public.validate_refund_completion();

-- =========================================================
-- Per-entity ledger view (customer/middleman/supplier/wallet)
-- =========================================================
CREATE OR REPLACE VIEW public.v_entity_ledger AS
SELECT
  t.id,
  t.date,
  t.created_at,
  t.type,
  t.category,
  t.source_type,
  t.source_id,
  t.payment_method,
  t.reference,
  t.note,
  t.debit,
  t.credit,
  t.amount,
  t.customer_id,
  CASE
    WHEN t.source_type LIKE 'supplier%' OR t.category='supplier' THEN 'supplier'
    WHEN t.source_type LIKE 'moallem%' OR t.category='middleman' THEN 'middleman'
    WHEN t.customer_id IS NOT NULL THEN 'customer'
    ELSE 'general'
  END AS ledger_type
FROM public.transactions t;

GRANT SELECT ON public.v_entity_ledger TO authenticated;
