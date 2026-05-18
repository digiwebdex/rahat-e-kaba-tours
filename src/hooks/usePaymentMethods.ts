import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PaymentMethodOption {
  value: string;
  label: string;
  category?: string;
}

const FALLBACK: PaymentMethodOption[] = [
  { value: "cash", label: "Cash" },
  { value: "bkash", label: "bKash" },
  { value: "nagad", label: "Nagad" },
  { value: "bank", label: "Bank Transfer" },
];

/**
 * Loads enabled payment methods configured in Admin → Payment Methods.
 * Falls back to a small default list while loading or if nothing is configured.
 */
export function usePaymentMethods() {
  const [methods, setMethods] = useState<PaymentMethodOption[]>(FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("company_settings")
        .select("setting_value")
        .eq("setting_key", "payment_methods")
        .maybeSingle();
      if (!active) return;
      const raw = (data?.setting_value as any) || null;
      if (Array.isArray(raw)) {
        const enabled = raw
          .filter((m: any) => m && m.enabled)
          .map((m: any) => ({
            value: String(m.id),
            label: String(m.name || m.id),
            category: m.category,
          }));
        if (enabled.length) setMethods(enabled);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  return { methods, loading };
}