import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient, supabase } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut, Users, DollarSign, CheckCircle2 } from "lucide-react";

const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export default function AgentPanelPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"apps" | "commissions">("apps");
  const [agent, setAgent] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [apps, setApps] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<{ commissions: any[]; totals: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [me, st, ap, co] = await Promise.all([
          apiClient.get("/agent/me"),
          apiClient.get("/agent/stats"),
          apiClient.get("/agent/applications"),
          apiClient.get("/agent/commissions"),
        ]);
        setAgent(me); setStats(st); setApps(ap); setCommissions(co);
      } catch (e: any) {
        setError(e?.message || "Unable to load agent panel");
      } finally { setLoading(false); }
    })();
  }, []);

  const logout = async () => { await supabase.auth.signOut(); navigate("/auth"); };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="p-8 max-w-md text-center">
        <h2 className="text-xl font-bold mb-2">Agent access required</h2>
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => navigate("/auth")}>Sign in</Button>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{agent?.name}</h1>
            <p className="text-xs text-muted-foreground capitalize">{agent?.kind} agent · {agent?.phone || agent?.email}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={logout}><LogOut className="h-4 w-4 mr-1" /> Sign out</Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-5"><div className="flex items-center gap-3"><Users className="h-5 w-5 text-primary" /><div><p className="text-xs text-muted-foreground">Applications</p><p className="text-2xl font-bold tabular-nums">{stats?.total_apps || 0}</p></div></div></Card>
          <Card className="p-5"><div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-green-600" /><div><p className="text-xs text-muted-foreground">Completed</p><p className="text-2xl font-bold tabular-nums">{stats?.completed_apps || 0}</p></div></div></Card>
          <Card className="p-5"><div className="flex items-center gap-3"><DollarSign className="h-5 w-5 text-amber-600" /><div><p className="text-xs text-muted-foreground">Pending commission (BDT)</p><p className="text-2xl font-bold tabular-nums">{fmt(commissions?.totals.pending)}</p></div></div></Card>
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant={tab==="apps"?"default":"outline"} onClick={()=>setTab("apps")}>Applications</Button>
          <Button size="sm" variant={tab==="commissions"?"default":"outline"} onClick={()=>setTab("commissions")}>Commissions</Button>
        </div>

        <Card className="overflow-hidden">
          {tab === "apps" ? (
            apps.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground text-sm">No applications yet.</div>
            ) : (
              <div className="overflow-x-auto"><table className="w-full text-sm">
                <thead className="bg-muted/40 border-b"><tr>
                  <th className="text-left px-4 py-3">Tracking</th>
                  <th className="text-left px-4 py-3">Service</th>
                  <th className="text-left px-4 py-3">Customer</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Total</th>
                  <th className="text-right px-4 py-3">Paid</th>
                </tr></thead>
                <tbody>
                  {apps.map((a) => (
                    <tr key={a.id} className="border-b border-border/40">
                      <td className="px-4 py-2 font-mono text-xs">{a.tracking_id}</td>
                      <td className="px-4 py-2">{a.service_name}</td>
                      <td className="px-4 py-2">{a.customer_name}<br/><span className="text-xs text-muted-foreground">{a.customer_phone}</span></td>
                      <td className="px-4 py-2 capitalize">{a.status}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{fmt(a.total_amount)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{fmt(a.paid_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            )
          ) : (
            commissions && commissions.commissions.length > 0 ? (
              <div className="overflow-x-auto"><table className="w-full text-sm">
                <thead className="bg-muted/40 border-b"><tr>
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Tracking</th>
                  <th className="text-left px-4 py-3">Service</th>
                  <th className="text-right px-4 py-3">Amount</th>
                  <th className="text-left px-4 py-3">Status</th>
                </tr></thead>
                <tbody>
                  {commissions.commissions.map((c) => (
                    <tr key={c.id} className="border-b border-border/40">
                      <td className="px-4 py-2">{new Date(c.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-2 font-mono text-xs">{c.tracking_id}</td>
                      <td className="px-4 py-2">{c.service_name}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{fmt(c.amount)}</td>
                      <td className="px-4 py-2 capitalize">{c.status}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/30 font-semibold">
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-right">Totals</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmt(commissions.totals.total)}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">Paid {fmt(commissions.totals.paid)} · Pending {fmt(commissions.totals.pending)}</td>
                  </tr>
                </tfoot>
              </table></div>
            ) : (
              <div className="p-10 text-center text-muted-foreground text-sm">No commissions yet.</div>
            )
          )}
        </Card>
      </main>
    </div>
  );
}