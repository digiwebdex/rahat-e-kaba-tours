import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminPaymentsNewPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try { setRows(await apiClient.get("/payments")); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const confirm = async (id: string) => {
    setConfirming(id);
    try {
      await apiClient.post(`/payments/${id}/confirm`, {});
      toast.success("Payment confirmed and posted to ledger");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to confirm");
    } finally { setConfirming(null); }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Payments</h1>
        <p className="text-sm text-muted-foreground">Confirm a payment to post Dr Cash / Cr Revenue to the ledger.</p>
      </div>
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2"/> Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">No payments yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b"><tr>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-right px-4 py-3">Amount</th>
                <th className="text-left px-4 py-3">Method</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Reference</th>
                <th className="text-right px-4 py-3">Action</th>
              </tr></thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-b border-border/40">
                    <td className="px-4 py-2">{new Date(p.paid_at || p.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{Number(p.amount||0).toLocaleString("en-IN")}</td>
                    <td className="px-4 py-2">{p.method_code || "—"}</td>
                    <td className="px-4 py-2 capitalize">{p.status}</td>
                    <td className="px-4 py-2 text-muted-foreground">{p.transaction_ref || "—"}</td>
                    <td className="px-4 py-2 text-right">
                      {p.status === "paid" ? (
                        <span className="text-xs text-green-600">Posted</span>
                      ) : (
                        <Button size="sm" disabled={confirming===p.id} onClick={() => confirm(p.id)}>
                          {confirming===p.id ? "…" : "Confirm"}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}