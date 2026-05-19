import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Briefcase, Wallet as WalletIcon, Users, AlertCircle } from "lucide-react";

interface Kpi { label: string; value: string; icon: any; tint: string; }

export default function AdminDashboardNewPage() {
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [apps, custs, wallets] = await Promise.all([
          apiClient.get("/applications").catch(() => []),
          apiClient.get("/customers").catch(() => []),
          apiClient.get("/wallets").catch(() => []),
        ]);
        const totalDue = (apps as any[]).reduce((s, a) => s + Number(a.due_amount || 0), 0);
        const cashInHand = (wallets as any[]).reduce((s, w) => s + Number(w.balance || 0), 0);
        setKpis([
          { label: "Applications", value: String((apps as any[]).length), icon: Briefcase, tint: "bg-primary/10 text-primary" },
          { label: "Customers", value: String((custs as any[]).length), icon: Users, tint: "bg-emerald-500/10 text-emerald-600" },
          { label: "Cash in Hand", value: `BDT ${cashInHand.toLocaleString("en-IN")}`, icon: WalletIcon, tint: "bg-blue-500/10 text-blue-600" },
          { label: "Total Receivable", value: `BDT ${totalDue.toLocaleString("en-IN")}`, icon: AlertCircle, tint: "bg-amber-500/10 text-amber-600" },
        ]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Al Rawsha Recruiting Platform overview</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {(loading ? Array.from({ length: 4 }) : kpis).map((k: any, i) => (
          <Card key={i} className="p-5">
            {k ? (
              <>
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${k.tint} mb-3`}>
                  <k.icon className="h-5 w-5" />
                </div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{k.label}</p>
                <p className="text-2xl font-bold tabular-nums mt-1">{k.value}</p>
              </>
            ) : (
              <div className="h-20 animate-pulse bg-muted/40 rounded" />
            )}
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <h2 className="font-semibold mb-2">Rebuild in progress</h2>
        <p className="text-sm text-muted-foreground">
          The recruiting platform is being rolled out in phases. Phase 1 (Foundation) is now live — Applications, Customers, Agents, Wallets and CMS sections are available. Booking flow, double-entry accounting, agent panels, invoices and reports come in the next phases.
        </p>
      </Card>
    </div>
  );
}