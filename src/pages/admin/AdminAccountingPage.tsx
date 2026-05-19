import { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Download } from "lucide-react";

type TBRow = { code: string; name: string; type: string; total_debit: number; total_credit: number; balance: number };
type PLData = { rows: { code: string; name: string; type: string; income_amount: number; expense_amount: number }[]; totals: { income: number; expense: number; net_profit: number } };

const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const downloadCsv = (filename: string, rows: (string | number)[][]) => {
  const csv = rows
    .map((r) =>
      r
        .map((c) => {
          const s = String(c ?? "");
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export default function AdminAccountingPage() {
  const [tab, setTab] = useState<"trial" | "pl" | "cashbook" | "journal">("trial");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [trial, setTrial] = useState<TBRow[]>([]);
  const [pl, setPl] = useState<PLData | null>(null);
  const [journal, setJournal] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [walletId, setWalletId] = useState<string>("");
  const [cashbook, setCashbook] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.get("/wallets").then((w) => {
      const arr = Array.isArray(w) ? w : [];
      setWallets(arr);
      if (arr[0] && !walletId) setWalletId(arr[0].id);
    }).catch(() => {});
    // eslint-disable-next-line
  }, []);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const qs = new URLSearchParams({ ...(from && { from }), ...(to && { to }) }).toString();
      const suffix = qs ? `?${qs}` : "";
      if (tab === "trial") setTrial(await apiClient.get(`/accounting/trial-balance${suffix}`));
      else if (tab === "pl") setPl(await apiClient.get(`/accounting/profit-loss${suffix}`));
      else if (tab === "cashbook") {
        if (!walletId) { setCashbook([]); }
        else {
          const qs2 = new URLSearchParams({ wallet_id: walletId, ...(from && { from }), ...(to && { to }) }).toString();
          setCashbook(await apiClient.get(`/accounting/cashbook?${qs2}`));
        }
      }
      else setJournal(await apiClient.get(`/journal-entries`));
    } catch (e: any) { setError(e?.message || "Failed"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab, walletId]);

  const exportCsv = () => {
    if (tab === "trial") {
      downloadCsv("trial-balance.csv", [
        ["Code", "Account", "Type", "Debit", "Credit", "Balance"],
        ...trial.map((r) => [r.code, r.name, r.type, r.total_debit, r.total_credit, r.balance]),
      ]);
    } else if (tab === "pl" && pl) {
      downloadCsv("profit-loss.csv", [
        ["Type", "Code", "Account", "Amount"],
        ...pl.rows.map((r) => [
          r.type,
          r.code,
          r.name,
          r.type === "income" ? r.income_amount : r.expense_amount,
        ]),
        [],
        ["Total Income", "", "", pl.totals.income],
        ["Total Expense", "", "", pl.totals.expense],
        ["Net Profit", "", "", pl.totals.net_profit],
      ]);
    } else if (tab === "cashbook") {
      downloadCsv("cashbook.csv", [
        ["Date", "Description", "Account", "Debit", "Credit"],
        ...cashbook.map((r) => [
          new Date(r.entry_date).toLocaleDateString(),
          r.description,
          `${r.account_code} ${r.account_name}`,
          r.debit,
          r.credit,
        ]),
      ]);
    } else {
      downloadCsv("journal.csv", [
        ["Date", "Description", "Ref", "Debit", "Credit"],
        ...journal.map((j) => [
          new Date(j.entry_date).toLocaleDateString(),
          j.description,
          j.ref_type,
          j.total_debit,
          j.total_credit,
        ]),
      ]);
    }
  };

  const cashbookTotals = useMemo(() => {
    return cashbook.reduce(
      (acc, r) => ({ debit: acc.debit + Number(r.debit || 0), credit: acc.credit + Number(r.credit || 0) }),
      { debit: 0, credit: 0 },
    );
  }, [cashbook]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Accounting</h1>
        <p className="text-sm text-muted-foreground">Trial balance, profit &amp; loss and journal entries.</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {([["trial","Trial Balance"],["pl","Profit & Loss"],["cashbook","Cashbook"],["journal","Journal"]] as const).map(([k,l]) => (
          <Button key={k} variant={tab===k?"default":"outline"} size="sm" onClick={() => setTab(k as any)}>{l}</Button>
        ))}
        {tab === "cashbook" && (
          <select
            value={walletId}
            onChange={(e) => setWalletId(e.target.value)}
            className="border rounded px-2 py-1 text-sm bg-background"
          >
            {wallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        )}
        {tab !== "journal" && (
          <div className="flex gap-2 items-center ml-auto">
            <input type="date" value={from} onChange={(e)=>setFrom(e.target.value)} className="border rounded px-2 py-1 text-sm" />
            <span className="text-sm text-muted-foreground">to</span>
            <input type="date" value={to} onChange={(e)=>setTo(e.target.value)} className="border rounded px-2 py-1 text-sm" />
            <Button size="sm" onClick={load}>Apply</Button>
            <Button size="sm" variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-1"/>CSV</Button>
          </div>
        )}
        {tab === "journal" && (
          <Button size="sm" variant="outline" className="ml-auto" onClick={exportCsv}>
            <Download className="h-4 w-4 mr-1"/>CSV
          </Button>
        )}
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2"/> Loading…</div>
        ) : error ? (
          <div className="p-8 text-center text-destructive text-sm">{error}</div>
        ) : tab === "trial" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b"><tr>
                <th className="text-left px-4 py-3">Code</th><th className="text-left px-4 py-3">Account</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-right px-4 py-3">Debit</th><th className="text-right px-4 py-3">Credit</th>
                <th className="text-right px-4 py-3">Balance</th>
              </tr></thead>
              <tbody>
                {trial.map((r) => (
                  <tr key={r.code} className="border-b border-border/40">
                    <td className="px-4 py-2 font-mono">{r.code}</td>
                    <td className="px-4 py-2">{r.name}</td>
                    <td className="px-4 py-2 capitalize text-muted-foreground">{r.type}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmt(r.total_debit)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmt(r.total_credit)}</td>
                    <td className="px-4 py-2 text-right tabular-nums font-medium">{fmt(r.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : tab === "pl" && pl ? (
          <div className="p-6 space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Income</h3>
              <table className="w-full text-sm">
                <tbody>
                  {pl.rows.filter(r=>r.type==="income").map(r => (
                    <tr key={r.code} className="border-b border-border/40">
                      <td className="py-1.5">{r.name}</td>
                      <td className="py-1.5 text-right tabular-nums">{fmt(r.income_amount)}</td>
                    </tr>
                  ))}
                  <tr className="font-semibold"><td className="py-2">Total Income</td><td className="py-2 text-right tabular-nums">{fmt(pl.totals.income)}</td></tr>
                </tbody>
              </table>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Expenses</h3>
              <table className="w-full text-sm">
                <tbody>
                  {pl.rows.filter(r=>r.type==="expense").map(r => (
                    <tr key={r.code} className="border-b border-border/40">
                      <td className="py-1.5">{r.name}</td>
                      <td className="py-1.5 text-right tabular-nums">{fmt(r.expense_amount)}</td>
                    </tr>
                  ))}
                  <tr className="font-semibold"><td className="py-2">Total Expenses</td><td className="py-2 text-right tabular-nums">{fmt(pl.totals.expense)}</td></tr>
                </tbody>
              </table>
            </div>
            <div className="border-t-2 border-foreground pt-3 flex justify-between text-lg font-bold">
              <span>Net Profit</span>
              <span className="tabular-nums">{fmt(pl.totals.net_profit)} BDT</span>
            </div>
          </div>
        ) : tab === "cashbook" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b"><tr>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Description</th>
                <th className="text-left px-4 py-3">Account</th>
                <th className="text-right px-4 py-3">Debit</th>
                <th className="text-right px-4 py-3">Credit</th>
              </tr></thead>
              <tbody>
                {cashbook.map((r, i) => (
                  <tr key={i} className="border-b border-border/40">
                    <td className="px-4 py-2">{new Date(r.entry_date).toLocaleDateString()}</td>
                    <td className="px-4 py-2">{r.description}</td>
                    <td className="px-4 py-2 text-muted-foreground"><span className="font-mono mr-1">{r.account_code}</span>{r.account_name}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmt(r.debit)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmt(r.credit)}</td>
                  </tr>
                ))}
                {cashbook.length > 0 && (
                  <tr className="font-semibold bg-muted/30">
                    <td className="px-4 py-2" colSpan={3}>Totals</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmt(cashbookTotals.debit)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmt(cashbookTotals.credit)}</td>
                  </tr>
                )}
              </tbody>
            </table>
            {cashbook.length === 0 && !loading && (
              <div className="p-8 text-center text-muted-foreground text-sm">No entries for this wallet/range.</div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b"><tr>
                <th className="text-left px-4 py-3">Date</th><th className="text-left px-4 py-3">Description</th>
                <th className="text-left px-4 py-3">Ref</th>
                <th className="text-right px-4 py-3">Debit</th><th className="text-right px-4 py-3">Credit</th>
              </tr></thead>
              <tbody>
                {journal.map((j) => (
                  <tr key={j.id} className="border-b border-border/40">
                    <td className="px-4 py-2">{new Date(j.entry_date).toLocaleDateString()}</td>
                    <td className="px-4 py-2">{j.description}</td>
                    <td className="px-4 py-2 text-muted-foreground capitalize">{j.ref_type}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmt(j.total_debit)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmt(j.total_credit)}</td>
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