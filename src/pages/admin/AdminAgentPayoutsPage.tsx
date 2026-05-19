import { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Wallet, FileDown } from "lucide-react";
import { toast } from "sonner";
import { downloadAgentStatement } from "@/lib/agentStatementPdf";

const fmt = (n: any) =>
  Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function AdminAgentPayoutsPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [agentId, setAgentId] = useState("");
  const [walletId, setWalletId] = useState("");
  const [commissions, setCommissions] = useState<any[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    Promise.all([apiClient.get("/agents"), apiClient.get("/wallets")])
      .then(([a, w]) => {
        const agentsArr = (Array.isArray(a) ? a : []).filter((x: any) => x.kind === "referral");
        const walletsArr = Array.isArray(w) ? w : [];
        setAgents(agentsArr);
        setWallets(walletsArr);
        if (agentsArr[0]) setAgentId(agentsArr[0].id);
        if (walletsArr[0]) setWalletId(walletsArr[0].id);
      })
      .catch((e) => toast.error(e?.message || "Failed to load"));
  }, []);

  useEffect(() => {
    if (!agentId) return;
    setLoading(true);
    apiClient
      .get(`/agent-commissions/by-agent/${agentId}`)
      .then((r) => {
        setCommissions(Array.isArray(r) ? r : []);
        setSelected({});
      })
      .catch((e) => toast.error(e?.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, [agentId]);

  const pending = useMemo(() => commissions.filter((c) => c.status === "accrued"), [commissions]);
  const paid = useMemo(() => commissions.filter((c) => c.status === "paid"), [commissions]);

  const currentAgent = useMemo(() => agents.find((a) => a.id === agentId), [agents, agentId]);

  const downloadStatement = () => {
    if (!currentAgent) return toast.error("Select an agent");
    downloadAgentStatement({ agent: currentAgent, pending, paid });
  };

  const totalSelected = useMemo(
    () => pending.filter((c) => selected[c.id]).reduce((s, c) => s + Number(c.amount), 0),
    [pending, selected],
  );

  const toggleAll = () => {
    if (Object.keys(selected).length === pending.length) setSelected({});
    else setSelected(Object.fromEntries(pending.map((c) => [c.id, true])));
  };

  const payout = async () => {
    const ids = pending.filter((c) => selected[c.id]).map((c) => c.id);
    if (!ids.length) return toast.error("Select at least one commission");
    if (!walletId) return toast.error("Select a wallet");
    setPaying(true);
    try {
      const res = await apiClient.post("/agent-commissions/payout", {
        agent_id: agentId,
        wallet_id: walletId,
        commission_ids: ids,
        notes,
      });
      toast.success(`Paid ${res.count} commission(s) — Total ${fmt(res.total)} BDT`);
      // refresh
      const r = await apiClient.get(`/agent-commissions/by-agent/${agentId}`);
      setCommissions(Array.isArray(r) ? r : []);
      setSelected({});
      setNotes("");
    } catch (e: any) {
      toast.error(e?.message || "Payout failed");
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Agent Commission Payouts</h1>
        <p className="text-sm text-muted-foreground">
          Settle accrued referral commissions and post the journal entry automatically.
        </p>
      </div>

      <Card className="p-4 grid sm:grid-cols-3 gap-3 items-end">
        <div>
          <label className="text-xs text-muted-foreground">Agent</label>
          <select
            className="w-full border rounded px-2 py-2 text-sm bg-background"
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
          >
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} {a.company_name ? `— ${a.company_name}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Pay from wallet</label>
          <select
            className="w-full border rounded px-2 py-2 text-sm bg-background"
            value={walletId}
            onChange={(e) => setWalletId(e.target.value)}
          >
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} — Bal {fmt(w.balance)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Notes (optional)</label>
          <input
            className="w-full border rounded px-2 py-2 text-sm bg-background"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="bKash ref, cheque #, etc."
          />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="font-semibold">Pending Commissions</h2>
            <p className="text-xs text-muted-foreground">
              {pending.length} pending • Selected total{" "}
              <span className="font-semibold text-foreground tabular-nums">{fmt(totalSelected)} BDT</span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={downloadStatement} disabled={!commissions.length}>
              <FileDown className="h-4 w-4 mr-1" /> Statement PDF
            </Button>
            <Button variant="outline" size="sm" onClick={toggleAll} disabled={!pending.length}>
              {Object.keys(selected).length === pending.length && pending.length ? "Unselect all" : "Select all"}
            </Button>
            <Button size="sm" disabled={paying || !totalSelected} onClick={payout}>
              {paying ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Wallet className="h-4 w-4 mr-1" />}
              Pay Selected
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="p-10 flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
          </div>
        ) : pending.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground text-sm">No accrued commissions.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b">
                <tr>
                  <th className="px-4 py-3 w-10"></th>
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Tracking</th>
                  <th className="text-left px-4 py-3">Service</th>
                  <th className="text-left px-4 py-3">Customer</th>
                  <th className="text-right px-4 py-3">Amount (BDT)</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((c) => (
                  <tr key={c.id} className="border-b border-border/40 hover:bg-muted/30">
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={!!selected[c.id]}
                        onChange={(e) => setSelected((s) => ({ ...s, [c.id]: e.target.checked }))}
                      />
                    </td>
                    <td className="px-4 py-2">{new Date(c.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-2 font-mono text-xs">{c.tracking_id || "—"}</td>
                    <td className="px-4 py-2 capitalize">{c.service_code || "—"}</td>
                    <td className="px-4 py-2">{c.customer_name || "—"}</td>
                    <td className="px-4 py-2 text-right tabular-nums font-medium">{fmt(c.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {paid.length > 0 && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="font-semibold">Payout History</h2>
            <p className="text-xs text-muted-foreground">{paid.length} paid commission(s).</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b">
                <tr>
                  <th className="text-left px-4 py-3">Paid Date</th>
                  <th className="text-left px-4 py-3">Tracking</th>
                  <th className="text-left px-4 py-3">Notes</th>
                  <th className="text-right px-4 py-3">Amount (BDT)</th>
                </tr>
              </thead>
              <tbody>
                {paid.map((c) => (
                  <tr key={c.id} className="border-b border-border/40">
                    <td className="px-4 py-2">{c.paid_at ? new Date(c.paid_at).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-2 font-mono text-xs">{c.tracking_id || "—"}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{c.notes || "—"}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmt(c.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}