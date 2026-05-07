import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, FileDown, FileSpreadsheet, Search, TrendingUp, TrendingDown, DollarSign, Wallet } from "lucide-react";
import { format, parseISO, isWithinInterval, startOfMonth, subDays, startOfDay, endOfDay } from "date-fns";
import { formatBDT, cn } from "@/lib/utils";
import { exportPDF, exportExcel } from "@/lib/reportExport";
import { useCanSeeProfit } from "@/components/admin/AdminLayout";

type Range = { from: Date; to: Date };

const inRange = (dateStr: string | null | undefined, r: Range) => {
  if (!dateStr) return false;
  try {
    const d = parseISO(dateStr);
    return isWithinInterval(d, { start: startOfDay(r.from), end: endOfDay(r.to) });
  } catch { return false; }
};

function DateRangePicker({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="font-normal">
            <CalendarIcon className="h-4 w-4 mr-2" />
            {format(value.from, "dd MMM yyyy")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={value.from} onSelect={(d) => d && onChange({ ...value, from: d })} initialFocus className={cn("p-3 pointer-events-auto")} />
        </PopoverContent>
      </Popover>
      <span className="text-muted-foreground text-sm">to</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="font-normal">
            <CalendarIcon className="h-4 w-4 mr-2" />
            {format(value.to, "dd MMM yyyy")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={value.to} onSelect={(d) => d && onChange({ ...value, to: d })} initialFocus className={cn("p-3 pointer-events-auto")} />
        </PopoverContent>
      </Popover>
      <div className="flex gap-1 ml-2">
        <Button size="sm" variant="ghost" onClick={() => onChange({ from: new Date(), to: new Date() })}>Today</Button>
        <Button size="sm" variant="ghost" onClick={() => onChange({ from: subDays(new Date(), 6), to: new Date() })}>7d</Button>
        <Button size="sm" variant="ghost" onClick={() => onChange({ from: startOfMonth(new Date()), to: new Date() })}>MTD</Button>
      </div>
    </div>
  );
}

function KpiTile({ label, value, icon: Icon, tone = "default" }: { label: string; value: string; icon: any; tone?: "default" | "good" | "bad" | "warn" }) {
  const toneCls = tone === "good" ? "text-emerald-600" : tone === "bad" ? "text-destructive" : tone === "warn" ? "text-yellow-600" : "text-foreground";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <Icon className="h-3.5 w-3.5" /> {label}
        </div>
        <div className={`text-xl font-bold tabular-nums ${toneCls}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

export default function AdminReportsPage() {
  const canSeeProfit = useCanSeeProfit();

  const [range, setRange] = useState<Range>({ from: startOfMonth(new Date()), to: new Date() });
  const [activeTab, setActiveTab] = useState("daily");
  const [searchQuery, setSearchQuery] = useState("");

  const [bookings, setBookings] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [visas, setVisas] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [supplierAgents, setSupplierAgents] = useState<any[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<any[]>([]);
  const [moallems, setMoallems] = useState<any[]>([]);
  const [commissionPayments, setCommissionPayments] = useState<any[]>([]);
  const [refunds, setRefunds] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from("bookings").select("*").order("created_at", { ascending: false }),
      supabase.from("ticket_bookings" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("visa_applications" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("payments").select("*, bookings(tracking_id, guest_name)").order("created_at", { ascending: false }),
      supabase.from("expenses").select("*").order("date", { ascending: false }),
      supabase.from("supplier_agents").select("*"),
      supabase.from("supplier_agent_payments").select("*").order("date", { ascending: false }),
      supabase.from("moallems").select("*"),
      supabase.from("moallem_commission_payments").select("*").order("date", { ascending: false }),
      supabase.from("refunds").select("*, bookings(tracking_id, guest_name)").order("created_at", { ascending: false }),
    ]).then(([bk, tk, vs, py, ex, sa, sp, ml, cp, rf]) => {
      setBookings(bk.data || []);
      setTickets(((tk as any).data as any[]) || []);
      setVisas(((vs as any).data as any[]) || []);
      setPayments(py.data || []);
      setExpenses(ex.data || []);
      setSupplierAgents(sa.data || []);
      setSupplierPayments(sp.data || []);
      setMoallems(ml.data || []);
      setCommissionPayments(cp.data || []);
      setRefunds(rf.data || []);
    });
  }, []);

  // ───── unified "applications" stream across the 3 services ─────
  const allApps = useMemo(() => {
    const wp = bookings.filter(b => b.status !== "cancelled").map(b => ({
      id: b.id, ref: b.tracking_id, customer: b.guest_name || "-", phone: b.guest_phone || "-",
      service: b.service_type === "work_permit" ? "Work Permit" : b.service_type === "visa" ? "Visa" : b.service_type === "air_ticket" ? "Air Ticket" : "Other",
      sale: Number(b.total_amount || 0), paid: Number(b.paid_amount || 0), due: Number(b.due_amount || 0),
      cost: Number(b.total_cost || 0), commission: Number(b.total_commission || 0),
      created_at: b.created_at, status: b.status,
    }));
    const tk = tickets.filter(t => t.status !== "cancelled").map(t => ({
      id: t.id, ref: t.invoice_no, customer: t.passenger_name || t.billing_name || "-", phone: "-",
      service: "Air Ticket",
      sale: Number(t.customer_billing_amount || 0), paid: Number(t.received_amount || 0), due: Number(t.customer_due || 0),
      cost: Number(t.our_cost || 0), commission: 0,
      created_at: t.created_at, status: t.status,
    }));
    const vs = visas.filter(v => v.status !== "cancelled").map(v => ({
      id: v.id, ref: v.invoice_no, customer: v.applicant_name || v.billing_name || "-", phone: "-",
      service: "Visa",
      sale: Number(v.billing_amount || 0), paid: Number(v.received_amount || 0), due: Number(v.customer_due || 0),
      cost: Number(v.our_cost || 0), commission: 0,
      created_at: v.created_at, status: v.status,
    }));
    return [...wp, ...tk, ...vs];
  }, [bookings, tickets, visas]);

  const filteredApps = useMemo(() => allApps.filter(a => inRange(a.created_at, range)), [allApps, range]);
  const q = searchQuery.toLowerCase().trim();
  const matchSearch = <T extends { customer?: string; phone?: string; ref?: string }>(r: T) =>
    !q || (r.customer || "").toLowerCase().includes(q) || (r.phone || "").includes(q) || (r.ref || "").toLowerCase().includes(q);

  // ─────  KPIs ─────
  const totals = useMemo(() => {
    const sale = filteredApps.reduce((s, a) => s + a.sale, 0);
    const paid = filteredApps.reduce((s, a) => s + a.paid, 0);
    const due = filteredApps.reduce((s, a) => s + a.due, 0);
    const cost = filteredApps.reduce((s, a) => s + a.cost, 0);
    const commission = filteredApps.reduce((s, a) => s + a.commission, 0);
    const expense = expenses.filter(e => inRange(e.date, range)).reduce((s, e) => s + Number(e.amount || 0), 0);
    const refund = refunds.filter(r => r.status === "processed" && inRange(r.processed_at || r.created_at, range))
      .reduce((s, r) => s + Number(r.refund_amount || 0), 0);
    return { sale, paid, due, cost, commission, expense, refund, profit: sale - cost - commission - expense - refund };
  }, [filteredApps, expenses, refunds, range]);

  // ─────  DAILY SALES ─────
  const dailyRows = useMemo(() => {
    const map = new Map<string, { date: string; apps: number; sale: number; paid: number; due: number }>();
    filteredApps.forEach(a => {
      const key = format(parseISO(a.created_at), "yyyy-MM-dd");
      const cur = map.get(key) || { date: key, apps: 0, sale: 0, paid: 0, due: 0 };
      cur.apps++; cur.sale += a.sale; cur.paid += a.paid; cur.due += a.due;
      map.set(key, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredApps]);

  // ─────  MONTHLY SALES ─────
  const monthlyRows = useMemo(() => {
    const map = new Map<string, { month: string; apps: number; sale: number; paid: number; due: number; profit: number }>();
    filteredApps.forEach(a => {
      const d = parseISO(a.created_at);
      const key = format(d, "yyyy-MM");
      const cur = map.get(key) || { month: key, apps: 0, sale: 0, paid: 0, due: 0, profit: 0 };
      cur.apps++; cur.sale += a.sale; cur.paid += a.paid; cur.due += a.due;
      cur.profit += (a.sale - a.cost - a.commission);
      map.set(key, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.month.localeCompare(a.month));
  }, [filteredApps]);

  // ─────  CUSTOMER DUE ─────
  const customerDueRows = useMemo(() => {
    const map = new Map<string, { customer: string; phone: string; service: string; ref: string; sale: number; paid: number; due: number; created_at: string }>();
    filteredApps.filter(a => a.due > 0).forEach(a => {
      const key = `${a.id}`;
      map.set(key, { customer: a.customer, phone: a.phone, service: a.service, ref: a.ref, sale: a.sale, paid: a.paid, due: a.due, created_at: a.created_at });
    });
    return Array.from(map.values()).filter(matchSearch).sort((a, b) => b.due - a.due);
  }, [filteredApps, q]);

  // ─────  SUPPLIER DUE ─────
  const supplierDueRows = useMemo(() => {
    const paidBySupplier = new Map<string, number>();
    supplierPayments.filter(p => inRange(p.date, range)).forEach(p => {
      paidBySupplier.set(p.supplier_agent_id, (paidBySupplier.get(p.supplier_agent_id) || 0) + Number(p.amount || 0));
    });
    const costBySupplier = new Map<string, { cost: number; bookings: number }>();
    bookings.filter(b => b.status !== "cancelled" && b.supplier_agent_id && inRange(b.created_at, range)).forEach(b => {
      const cur = costBySupplier.get(b.supplier_agent_id) || { cost: 0, bookings: 0 };
      cur.cost += Number(b.total_cost || 0); cur.bookings++;
      costBySupplier.set(b.supplier_agent_id, cur);
    });
    return supplierAgents.map(s => {
      const c = costBySupplier.get(s.id) || { cost: 0, bookings: 0 };
      const paid = paidBySupplier.get(s.id) || 0;
      return { id: s.id, name: s.agent_name, company: s.company_name || "-", phone: s.phone || "-", bookings: c.bookings, cost: c.cost, paid, due: Math.max(0, c.cost - paid) };
    }).filter(r => r.cost > 0 || r.paid > 0)
      .filter(r => !q || r.name.toLowerCase().includes(q) || (r.company || "").toLowerCase().includes(q))
      .sort((a, b) => b.due - a.due);
  }, [supplierAgents, supplierPayments, bookings, range, q]);

  // ─────  MIDDLEMAN COMMISSION ─────
  const commissionRows = useMemo(() => {
    const paidByMid = new Map<string, number>();
    commissionPayments.filter(p => inRange(p.date, range)).forEach(p => {
      paidByMid.set(p.moallem_id, (paidByMid.get(p.moallem_id) || 0) + Number(p.amount || 0));
    });
    const dueByMid = new Map<string, { commission: number; bookings: number }>();
    bookings.filter(b => b.status !== "cancelled" && b.moallem_id && inRange(b.created_at, range)).forEach(b => {
      const cur = dueByMid.get(b.moallem_id) || { commission: 0, bookings: 0 };
      cur.commission += Number(b.total_commission || 0); cur.bookings++;
      dueByMid.set(b.moallem_id, cur);
    });
    return moallems.map(m => {
      const d = dueByMid.get(m.id) || { commission: 0, bookings: 0 };
      const paid = paidByMid.get(m.id) || 0;
      return { id: m.id, name: m.name, phone: m.phone || "-", bookings: d.bookings, commission: d.commission, paid, due: Math.max(0, d.commission - paid) };
    }).filter(r => r.commission > 0 || r.paid > 0)
      .filter(r => !q || r.name.toLowerCase().includes(q))
      .sort((a, b) => b.due - a.due);
  }, [moallems, commissionPayments, bookings, range, q]);

  // ─────  REFUNDS ─────
  const refundRows = useMemo(() => {
    return refunds
      .filter(r => inRange(r.created_at, range))
      .map(r => ({
        ref: r.bookings?.tracking_id || "-",
        customer: r.bookings?.guest_name || "-",
        original: Number(r.original_amount || 0),
        refund: Number(r.refund_amount || 0),
        deduction: Number(r.deduction_amount || 0),
        method: r.refund_method || "-",
        status: r.status,
        date: r.processed_at || r.created_at,
      }))
      .filter(r => !q || (r.customer || "").toLowerCase().includes(q) || (r.ref || "").toLowerCase().includes(q))
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [refunds, range, q]);

  // ─────  EXPORT helpers ─────
  const exportRows = (fmt: "pdf" | "xlsx", title: string, columns: string[], rows: (string | number)[][], summary?: string[]) => {
    if (fmt === "pdf") exportPDF({ title, columns, rows, summary });
    else exportExcel({ title, columns, rows, summary });
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-sm text-muted-foreground">Live reports across Work Permit, Air Tickets and Visa Services</p>
        </div>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <KpiTile label="Total Sales" value={formatBDT(totals.sale)} icon={DollarSign} />
        <KpiTile label="Income Received" value={formatBDT(totals.paid)} icon={TrendingUp} tone="good" />
        <KpiTile label="Customer Due" value={formatBDT(totals.due)} icon={Wallet} tone="warn" />
        <KpiTile label="Supplier Cost" value={formatBDT(totals.cost)} icon={TrendingDown} />
        <KpiTile label="Commission" value={formatBDT(totals.commission)} icon={TrendingDown} />
        <KpiTile label="Expenses" value={formatBDT(totals.expense)} icon={TrendingDown} />
        <KpiTile label="Refunds" value={formatBDT(totals.refund)} icon={TrendingDown} tone="bad" />
        {canSeeProfit && <KpiTile label="Net Profit" value={formatBDT(totals.profit)} icon={TrendingUp} tone={totals.profit >= 0 ? "good" : "bad"} />}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by customer, reference or phone..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="daily">Daily Sales</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Sales</TabsTrigger>
          <TabsTrigger value="customer-due">Customer Due</TabsTrigger>
          <TabsTrigger value="supplier-due">Supplier Due</TabsTrigger>
          <TabsTrigger value="commission">Middleman Commission</TabsTrigger>
          {canSeeProfit && <TabsTrigger value="profit">Net Profit</TabsTrigger>}
          <TabsTrigger value="refund">Refunds</TabsTrigger>
        </TabsList>

        {/* DAILY SALES */}
        <TabsContent value="daily">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Daily Sales Report</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => exportRows("pdf", "Daily Sales Report", ["Date", "Apps", "Sales", "Received", "Due"], dailyRows.map(r => [r.date, r.apps, r.sale, r.paid, r.due]))}><FileDown className="h-3.5 w-3.5 mr-1" />PDF</Button>
                <Button size="sm" variant="outline" onClick={() => exportRows("xlsx", "Daily Sales Report", ["Date", "Apps", "Sales", "Received", "Due"], dailyRows.map(r => [r.date, r.apps, r.sale, r.paid, r.due]))}><FileSpreadsheet className="h-3.5 w-3.5 mr-1" />Excel</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead className="text-right">Apps</TableHead><TableHead className="text-right">Sales</TableHead><TableHead className="text-right">Received</TableHead><TableHead className="text-right">Due</TableHead></TableRow></TableHeader>
                <TableBody>
                  {dailyRows.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No data in range</TableCell></TableRow> :
                    dailyRows.map(r => (
                      <TableRow key={r.date}>
                        <TableCell>{format(parseISO(r.date), "dd MMM yyyy")}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.apps}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatBDT(r.sale)}</TableCell>
                        <TableCell className="text-right tabular-nums text-emerald-600">{formatBDT(r.paid)}</TableCell>
                        <TableCell className="text-right tabular-nums text-yellow-600">{formatBDT(r.due)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MONTHLY SALES */}
        <TabsContent value="monthly">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Monthly Sales Report</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => exportRows("pdf", "Monthly Sales Report", ["Month", "Apps", "Sales", "Received", "Due", "Profit"], monthlyRows.map(r => [r.month, r.apps, r.sale, r.paid, r.due, r.profit]))}><FileDown className="h-3.5 w-3.5 mr-1" />PDF</Button>
                <Button size="sm" variant="outline" onClick={() => exportRows("xlsx", "Monthly Sales Report", ["Month", "Apps", "Sales", "Received", "Due", "Profit"], monthlyRows.map(r => [r.month, r.apps, r.sale, r.paid, r.due, r.profit]))}><FileSpreadsheet className="h-3.5 w-3.5 mr-1" />Excel</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Month</TableHead><TableHead className="text-right">Apps</TableHead><TableHead className="text-right">Sales</TableHead><TableHead className="text-right">Received</TableHead><TableHead className="text-right">Due</TableHead>{canSeeProfit && <TableHead className="text-right">Profit</TableHead>}</TableRow></TableHeader>
                <TableBody>
                  {monthlyRows.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No data in range</TableCell></TableRow> :
                    monthlyRows.map(r => (
                      <TableRow key={r.month}>
                        <TableCell>{format(parseISO(r.month + "-01"), "MMM yyyy")}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.apps}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatBDT(r.sale)}</TableCell>
                        <TableCell className="text-right tabular-nums text-emerald-600">{formatBDT(r.paid)}</TableCell>
                        <TableCell className="text-right tabular-nums text-yellow-600">{formatBDT(r.due)}</TableCell>
                        {canSeeProfit && <TableCell className={`text-right tabular-nums ${r.profit >= 0 ? "text-emerald-600" : "text-destructive"}`}>{formatBDT(r.profit)}</TableCell>}
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CUSTOMER DUE */}
        <TabsContent value="customer-due">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Customer Due Report ({customerDueRows.length})</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => exportRows("pdf", "Customer Due Report", ["Reference", "Customer", "Phone", "Service", "Sale", "Paid", "Due"], customerDueRows.map(r => [r.ref, r.customer, r.phone, r.service, r.sale, r.paid, r.due]))}><FileDown className="h-3.5 w-3.5 mr-1" />PDF</Button>
                <Button size="sm" variant="outline" onClick={() => exportRows("xlsx", "Customer Due Report", ["Reference", "Customer", "Phone", "Service", "Sale", "Paid", "Due"], customerDueRows.map(r => [r.ref, r.customer, r.phone, r.service, r.sale, r.paid, r.due]))}><FileSpreadsheet className="h-3.5 w-3.5 mr-1" />Excel</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Reference</TableHead><TableHead>Customer</TableHead><TableHead>Service</TableHead><TableHead className="text-right">Sale</TableHead><TableHead className="text-right">Paid</TableHead><TableHead className="text-right">Due</TableHead></TableRow></TableHeader>
                <TableBody>
                  {customerDueRows.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No outstanding customer dues</TableCell></TableRow> :
                    customerDueRows.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs">{r.ref}</TableCell>
                        <TableCell>{r.customer}<div className="text-xs text-muted-foreground">{r.phone}</div></TableCell>
                        <TableCell><Badge variant="outline">{r.service}</Badge></TableCell>
                        <TableCell className="text-right tabular-nums">{formatBDT(r.sale)}</TableCell>
                        <TableCell className="text-right tabular-nums text-emerald-600">{formatBDT(r.paid)}</TableCell>
                        <TableCell className="text-right tabular-nums text-yellow-600 font-semibold">{formatBDT(r.due)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SUPPLIER DUE */}
        <TabsContent value="supplier-due">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Supplier Due Report</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => exportRows("pdf", "Supplier Due Report", ["Supplier", "Company", "Bookings", "Cost", "Paid", "Due"], supplierDueRows.map(r => [r.name, r.company, r.bookings, r.cost, r.paid, r.due]))}><FileDown className="h-3.5 w-3.5 mr-1" />PDF</Button>
                <Button size="sm" variant="outline" onClick={() => exportRows("xlsx", "Supplier Due Report", ["Supplier", "Company", "Bookings", "Cost", "Paid", "Due"], supplierDueRows.map(r => [r.name, r.company, r.bookings, r.cost, r.paid, r.due]))}><FileSpreadsheet className="h-3.5 w-3.5 mr-1" />Excel</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Supplier</TableHead><TableHead>Company</TableHead><TableHead className="text-right">Bookings</TableHead><TableHead className="text-right">Cost</TableHead><TableHead className="text-right">Paid</TableHead><TableHead className="text-right">Due</TableHead></TableRow></TableHeader>
                <TableBody>
                  {supplierDueRows.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No supplier activity in range</TableCell></TableRow> :
                    supplierDueRows.map(r => (
                      <TableRow key={r.id}>
                        <TableCell>{r.name}<div className="text-xs text-muted-foreground">{r.phone}</div></TableCell>
                        <TableCell>{r.company}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.bookings}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatBDT(r.cost)}</TableCell>
                        <TableCell className="text-right tabular-nums text-emerald-600">{formatBDT(r.paid)}</TableCell>
                        <TableCell className="text-right tabular-nums text-yellow-600 font-semibold">{formatBDT(r.due)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MIDDLEMAN COMMISSION */}
        <TabsContent value="commission">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Middleman Commission Report</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => exportRows("pdf", "Middleman Commission Report", ["Middleman", "Phone", "Bookings", "Commission", "Paid", "Due"], commissionRows.map(r => [r.name, r.phone, r.bookings, r.commission, r.paid, r.due]))}><FileDown className="h-3.5 w-3.5 mr-1" />PDF</Button>
                <Button size="sm" variant="outline" onClick={() => exportRows("xlsx", "Middleman Commission Report", ["Middleman", "Phone", "Bookings", "Commission", "Paid", "Due"], commissionRows.map(r => [r.name, r.phone, r.bookings, r.commission, r.paid, r.due]))}><FileSpreadsheet className="h-3.5 w-3.5 mr-1" />Excel</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Middleman</TableHead><TableHead>Phone</TableHead><TableHead className="text-right">Bookings</TableHead><TableHead className="text-right">Commission</TableHead><TableHead className="text-right">Paid</TableHead><TableHead className="text-right">Due</TableHead></TableRow></TableHeader>
                <TableBody>
                  {commissionRows.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No commission activity in range</TableCell></TableRow> :
                    commissionRows.map(r => (
                      <TableRow key={r.id}>
                        <TableCell>{r.name}</TableCell>
                        <TableCell>{r.phone}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.bookings}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatBDT(r.commission)}</TableCell>
                        <TableCell className="text-right tabular-nums text-emerald-600">{formatBDT(r.paid)}</TableCell>
                        <TableCell className="text-right tabular-nums text-yellow-600 font-semibold">{formatBDT(r.due)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* NET PROFIT */}
        {canSeeProfit && (
          <TabsContent value="profit">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Net Profit Report</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                  <KpiTile label="Total Sales" value={formatBDT(totals.sale)} icon={DollarSign} />
                  <KpiTile label="Supplier Cost" value={`(${formatBDT(totals.cost)})`} icon={TrendingDown} />
                  <KpiTile label="Commission" value={`(${formatBDT(totals.commission)})`} icon={TrendingDown} />
                  <KpiTile label="Expenses" value={`(${formatBDT(totals.expense)})`} icon={TrendingDown} />
                  <KpiTile label="Refunds" value={`(${formatBDT(totals.refund)})`} icon={TrendingDown} tone="bad" />
                  <KpiTile label="Net Profit" value={formatBDT(totals.profit)} icon={TrendingUp} tone={totals.profit >= 0 ? "good" : "bad"} />
                </div>
                <Table>
                  <TableHeader><TableRow><TableHead>Service</TableHead><TableHead className="text-right">Sales</TableHead><TableHead className="text-right">Cost</TableHead><TableHead className="text-right">Commission</TableHead><TableHead className="text-right">Profit</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(["Work Permit", "Air Ticket", "Visa", "Other"] as const).map(svc => {
                      const apps = filteredApps.filter(a => a.service === svc);
                      if (apps.length === 0) return null;
                      const sale = apps.reduce((s, a) => s + a.sale, 0);
                      const cost = apps.reduce((s, a) => s + a.cost, 0);
                      const com = apps.reduce((s, a) => s + a.commission, 0);
                      const profit = sale - cost - com;
                      return (
                        <TableRow key={svc}>
                          <TableCell><Badge variant="outline">{svc}</Badge> <span className="text-xs text-muted-foreground ml-1">{apps.length} apps</span></TableCell>
                          <TableCell className="text-right tabular-nums">{formatBDT(sale)}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatBDT(cost)}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatBDT(com)}</TableCell>
                          <TableCell className={`text-right tabular-nums font-semibold ${profit >= 0 ? "text-emerald-600" : "text-destructive"}`}>{formatBDT(profit)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <div className="mt-3 flex gap-2 justify-end">
                  <Button size="sm" variant="outline" onClick={() => exportRows("pdf", "Net Profit Report", ["Metric", "Amount"], [["Total Sales", totals.sale], ["Supplier Cost", -totals.cost], ["Commission", -totals.commission], ["Expenses", -totals.expense], ["Refunds", -totals.refund], ["Net Profit", totals.profit]])}><FileDown className="h-3.5 w-3.5 mr-1" />PDF</Button>
                  <Button size="sm" variant="outline" onClick={() => exportRows("xlsx", "Net Profit Report", ["Metric", "Amount"], [["Total Sales", totals.sale], ["Supplier Cost", -totals.cost], ["Commission", -totals.commission], ["Expenses", -totals.expense], ["Refunds", -totals.refund], ["Net Profit", totals.profit]])}><FileSpreadsheet className="h-3.5 w-3.5 mr-1" />Excel</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* REFUNDS */}
        <TabsContent value="refund">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Refund Report</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => exportRows("pdf", "Refund Report", ["Date", "Reference", "Customer", "Original", "Refund", "Deduction", "Method", "Status"], refundRows.map(r => [r.date ? format(parseISO(r.date), "dd MMM yyyy") : "-", r.ref, r.customer, r.original, r.refund, r.deduction, r.method, r.status]))}><FileDown className="h-3.5 w-3.5 mr-1" />PDF</Button>
                <Button size="sm" variant="outline" onClick={() => exportRows("xlsx", "Refund Report", ["Date", "Reference", "Customer", "Original", "Refund", "Deduction", "Method", "Status"], refundRows.map(r => [r.date ? format(parseISO(r.date), "dd MMM yyyy") : "-", r.ref, r.customer, r.original, r.refund, r.deduction, r.method, r.status]))}><FileSpreadsheet className="h-3.5 w-3.5 mr-1" />Excel</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Reference</TableHead><TableHead>Customer</TableHead><TableHead className="text-right">Original</TableHead><TableHead className="text-right">Refund</TableHead><TableHead className="text-right">Deduction</TableHead><TableHead>Method</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {refundRows.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">No refunds in range</TableCell></TableRow> :
                    refundRows.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>{r.date ? format(parseISO(r.date), "dd MMM yyyy") : "-"}</TableCell>
                        <TableCell className="font-mono text-xs">{r.ref}</TableCell>
                        <TableCell>{r.customer}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatBDT(r.original)}</TableCell>
                        <TableCell className="text-right tabular-nums text-destructive">{formatBDT(r.refund)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatBDT(r.deduction)}</TableCell>
                        <TableCell><Badge variant="outline">{r.method}</Badge></TableCell>
                        <TableCell><Badge variant={r.status === "processed" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}