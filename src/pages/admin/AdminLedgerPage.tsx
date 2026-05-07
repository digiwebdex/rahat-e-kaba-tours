import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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
  const [scope, setScope] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [loading, setLoading] = useState(true);

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
  }, [from, to]);

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
        <h1 className="text-2xl font-bold">Ledger</h1>
        <p className="text-sm text-muted-foreground">Unified debit/credit history across customers, suppliers, middlemen, and wallets.</p>
      </div>

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
    </div>
  );
}