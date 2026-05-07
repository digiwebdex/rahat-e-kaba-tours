import { useEffect, useState } from "react";
import { supabase } from "@/lib/api";
import AdminDashboardCharts from "@/components/AdminDashboardCharts";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function AdminDashboardPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [financialSummary, setFinancialSummary] = useState<any>(null);
  const [moallemPayments, setMoallemPayments] = useState<any[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<any[]>([]);
  const [commissionPayments, setCommissionPayments] = useState<any[]>([]);
  const [moallems, setMoallems] = useState<any[]>([]);
  const [supplierAgents, setSupplierAgents] = useState<any[]>([]);
  const [supplierContracts, setSupplierContracts] = useState<any[]>([]);
  const [supplierContractPayments, setSupplierContractPaymentsState] = useState<any[]>([]);
  const [dailyCashbook, setDailyCashbook] = useState<any[]>([]);
  const [liveKpis, setLiveKpis] = useState<any>(null);
  const [walletBalances, setWalletBalances] = useState<any[]>([]);
  const [recalculating, setRecalculating] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [bk, py, ex, ac, fs, mp, sp, cp, ml, sa, sc, scp, dcb, kp, wb] = await Promise.all([
      supabase.from("bookings").select("*, packages(name, type)").order("created_at", { ascending: false }),
      supabase.from("payments").select("*, bookings(tracking_id)").order("created_at", { ascending: false }),
      supabase.from("expenses").select("*").order("date", { ascending: false }),
      supabase.from("accounts").select("*"),
      supabase.from("financial_summary").select("*").limit(1).maybeSingle(),
      supabase.from("moallem_payments").select("*, moallems(name)").order("created_at", { ascending: false }),
      supabase.from("supplier_agent_payments").select("*, supplier_agents(agent_name)").order("created_at", { ascending: false }),
      supabase.from("moallem_commission_payments").select("*, moallems(name)").order("created_at", { ascending: false }),
      supabase.from("moallems").select("*"),
      supabase.from("supplier_agents").select("*"),
      supabase.from("supplier_contracts").select("*"),
      supabase.from("supplier_contract_payments").select("*").order("created_at", { ascending: false }),
      supabase.from("daily_cashbook").select("*").order("date", { ascending: false }),
      supabase.from("dashboard_kpis" as any).select("*").maybeSingle(),
      supabase.from("wallet_balances" as any).select("*"),
    ]);
    setBookings(bk.data || []);
    setPayments(py.data || []);
    setExpenses(ex.data || []);
    setAccounts((ac.data as any[]) || []);
    setFinancialSummary(fs.data || null);
    setMoallemPayments(mp.data || []);
    setSupplierPayments(sp.data || []);
    setCommissionPayments(cp.data || []);
    setMoallems(ml.data || []);
    setSupplierAgents(sa.data || []);
    setSupplierContracts(sc.data || []);
    setSupplierContractPaymentsState(scp.data || []);
    setDailyCashbook(dcb.data || []);
    setLiveKpis((kp as any)?.data || null);
    setWalletBalances(((wb as any)?.data as any[]) || []);
  };

  const markPaymentCompleted = async (paymentId: string) => {
    const { error } = await supabase.from("payments").update({ status: "completed", paid_at: new Date().toISOString() }).eq("id", paymentId);
    if (error) return;
    fetchData();
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const { data, error } = await (supabase as any).rpc("recalculate_all_financials");
      if (error) throw error;
      toast.success("Financial data recalculated", {
        description: `Net profit: ${data?.net_profit ?? 0} • Customer due: ${data?.customer_due ?? 0}`,
      });
      await fetchData();
    } catch (e: any) {
      toast.error("Recalculation failed", { description: e?.message });
    } finally {
      setRecalculating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleRecalculate} disabled={recalculating} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${recalculating ? "animate-spin" : ""}`} />
          {recalculating ? "Recalculating..." : "Recalculate Financial Data"}
        </Button>
      </div>
      <AdminDashboardCharts
      bookings={bookings}
      payments={payments}
      expenses={expenses}
      accounts={accounts}
      financialSummary={financialSummary}
      moallemPayments={moallemPayments}
      supplierPayments={supplierPayments}
      commissionPayments={commissionPayments}
      moallems={moallems}
      supplierAgents={supplierAgents}
      supplierContracts={supplierContracts}
      supplierContractPayments={supplierContractPayments}
      dailyCashbook={dailyCashbook}
      liveKpis={liveKpis}
      walletBalances={walletBalances}
      onMarkPaid={markPaymentCompleted}
      />
    </div>
  );
}
