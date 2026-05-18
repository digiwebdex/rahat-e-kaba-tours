import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

interface Row {
  id: string;
  date: string;
  type: string;
  category: string;
  source_type: string;
  payment_method: string | null;
  reference: string | null;
  note: string | null;
  debit: number;
  credit: number;
  customer_id: string | null;
  ledger_type: string;
}

export default function AdminLedgerPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [scope, setScope] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [moallems, setMoallems] = useState<any[]>([]);
  const [payOpen, setPayOpen] = useState(false);
  const [paySaving, setPaySaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const emptyPay = {
    payee_type: "supplier" as "supplier" | "middleman",
    payee_id: "",
    amount: "",
    payment_method: "cash",
    wallet_account_id: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  };
  const [payForm, setPayForm] = useState(emptyPay);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let q = supabase.from("v_entity_ledger").select("*").order("date", { ascending: false }).limit(1000);
      if (from) q = q.gte("date", from);
      if (to) q = q.lte("date", to);
      const { data } = await q;
      setRows((data as any) || []);
      setLoading(false);
    })();
  }, [from, to, reloadKey]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("accounts" as any)
        .select("id,name,type,balance")
        .eq("type", "asset")
        .order("name");
      setWallets((data as any) || []);
    })();
  }, [reloadKey]);

  useEffect(() => {
    (async () => {
      const [sRes, mRes] = await Promise.all([
        supabase.from("supplier_agents" as any).select("id,agent_name,company_name").eq("status", "active").order("agent_name"),
        supabase.from("moallems" as any).select("id,name,phone").eq("status", "active").order("name"),
      ]);
      setSuppliers((sRes.data as any) || []);
      setMoallems((mRes.data as any) || []);
    })();
  }, []);

  const payeeOptions = payForm.payee_type === "supplier"
    ? suppliers.map(s => ({ id: s.id, label: s.agent_name + (s.company_name ? ` — ${s.company_name}` : "") }))
    : moallems.map(m => ({ id: m.id, label: m.name + (m.phone ? ` (${m.phone})` : "") }));

  const submitPayment = async () => {
    const amount = parseFloat(payForm.amount);
    if (!payForm.payee_id) { toast({ title: "Select a payee", variant: "destructive" }); return; }
    if (!amount || amount <= 0) { toast({ title: "Enter a valid amount", variant: "destructive" }); return; }
    if (!payForm.wallet_account_id) { toast({ title: "Select a wallet/account", variant: "destructive" }); return; }
    setPaySaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user.id || null;
      if (payForm.payee_type === "supplier") {
        const { error } = await supabase.from("supplier_agent_payments" as any).insert({
          supplier_agent_id: payForm.payee_id,
          amount,
          payment_method: payForm.payment_method,
          wallet_account_id: payForm.wallet_account_id,
          date: payForm.date,
          notes: payForm.notes.trim() || null,
          recorded_by: userId,
        });
        if (error) throw error;
        const payee = suppliers.find(s => s.id === payForm.payee_id);
        await supabase.from("expenses" as any).insert({
          title: `Supplier Payment — ${payee?.agent_name || ""}`,
          amount, category: "supplier_payment", expense_type: "supplier",
          date: payForm.date,
          note: payForm.notes.trim() || `Payment to supplier: ${payee?.agent_name}`,
          wallet_account_id: payForm.wallet_account_id,
        });
      } else {
        const { error } = await supabase.from("moallem_payments" as any).insert({
          moallem_id: payForm.payee_id,
          amount,
          payment_method: payForm.payment_method,
          wallet_account_id: payForm.wallet_account_id,
          date: payForm.date,
          notes: payForm.notes.trim() || null,
          recorded_by: userId,
        });
        if (error) throw error;
      }
      toast({ title: "Payment recorded" });
      setPayOpen(false);
      setPayForm(emptyPay);
      setReloadKey(k => k + 1);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setPaySaving(false);
    }
  };

  const filtered = useMemo(() => rows.filter(r => {
    if (scope !== "all" && r.ledger_type !== scope) return false;
    if (search && !`${r.reference || ""} ${r.note || ""} ${r.category} ${r.source_type}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [rows, scope, search]);

  const totals = useMemo(() => filtered.reduce(
    (a, r) => ({ debit: a.debit + Number(r.debit || 0), credit: a.credit + Number(r.credit || 0) }),
    { debit: 0, credit: 0 }
  ), [filtered]);

  const balance = totals.credit - totals.debit;

  return (
    <div className="space-y-4 p-6">
      <div>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Ledger</h1>
            <p className="text-sm text-muted-foreground">Unified debit/credit history across customers, suppliers, middlemen, and wallets.</p>
          </div>
          <Button onClick={() => setPayOpen(true)}><Plus className="h-4 w-4 mr-1" /> Pay Supplier / Middleman</Button>
        </div>
      </div>

      {wallets.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Wallet / Account Balances</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {wallets.map(w => (
                <div key={w.id} className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground truncate">{w.name}</div>
                  <div className={`text-lg font-bold tabular-nums ${Number(w.balance) >= 0 ? "text-green-600" : "text-red-600"}`}>৳{Number(w.balance || 0).toLocaleString("en-IN")}</div>
                </div>
              ))}
              <div className="rounded-md border p-3 bg-muted/40">
                <div className="text-xs text-muted-foreground">Total Cash & Bank</div>
                <div className="text-lg font-bold tabular-nums">৳{wallets.reduce((s, w) => s + Number(w.balance || 0), 0).toLocaleString("en-IN")}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Total Credit (In)</div>
          <div className="text-xl font-bold tabular-nums text-green-600">৳{totals.credit.toLocaleString("en-IN")}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Total Debit (Out)</div>
          <div className="text-xl font-bold tabular-nums text-red-600">৳{totals.debit.toLocaleString("en-IN")}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Net Balance</div>
          <div className={`text-xl font-bold tabular-nums ${balance >= 0 ? "text-green-600" : "text-red-600"}`}>৳{balance.toLocaleString("en-IN")}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Entries</div>
          <div className="text-xl font-bold tabular-nums">{filtered.length}</div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle>Transactions</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ledgers</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="supplier">Supplier</SelectItem>
                <SelectItem value="middleman">Middleman</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-40" />
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-40" />
            <Input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} className="w-48" />
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Ledger</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">Loading…</TableCell></TableRow>}
              {!loading && filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">No entries.</TableCell></TableRow>}
              {filtered.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{r.date}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{r.ledger_type}</Badge></TableCell>
                  <TableCell className="text-xs">{r.source_type}</TableCell>
                  <TableCell className="text-xs">{r.category}</TableCell>
                  <TableCell className="text-xs">{r.payment_method || "—"}</TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate" title={r.reference || r.note || ""}>{r.reference || r.note || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums text-red-600">{Number(r.debit) ? Number(r.debit).toLocaleString("en-IN") : "—"}</TableCell>
                  <TableCell className="text-right tabular-nums text-green-600">{Number(r.credit) ? Number(r.credit).toLocaleString("en-IN") : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Payee Type</Label>
                <Select value={payForm.payee_type} onValueChange={(v: any) => setPayForm({ ...payForm, payee_type: v, payee_id: "" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="supplier">Supplier</SelectItem>
                    <SelectItem value="middleman">Middleman (Moallem)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={payForm.date} onChange={e => setPayForm({ ...payForm, date: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Payee</Label>
              <Select value={payForm.payee_id} onValueChange={v => setPayForm({ ...payForm, payee_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {payeeOptions.map(o => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
                  {payeeOptions.length === 0 && <div className="px-2 py-1 text-xs text-muted-foreground">No active records</div>}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Amount</Label>
                <Input type="number" min="0" step="0.01" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} />
              </div>
              <div>
                <Label>Method</Label>
                <Select value={payForm.payment_method} onValueChange={v => setPayForm({ ...payForm, payment_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank">Bank</SelectItem>
                    <SelectItem value="mobile">Mobile</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>From Wallet / Account</Label>
              <Select value={payForm.wallet_account_id} onValueChange={v => setPayForm({ ...payForm, wallet_account_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select wallet…" /></SelectTrigger>
                <SelectContent>
                  {wallets.map(w => <SelectItem key={w.id} value={w.id}>{w.name} (৳{Number(w.balance || 0).toLocaleString("en-IN")})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea rows={2} value={payForm.notes} onChange={e => setPayForm({ ...payForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)} disabled={paySaving}>Cancel</Button>
            <Button onClick={submitPayment} disabled={paySaving}>{paySaving ? "Saving…" : "Record Payment"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}