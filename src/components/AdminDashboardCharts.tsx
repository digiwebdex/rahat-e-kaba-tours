import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp, DollarSign, Package,
  Users, Wallet, ArrowUpRight, ArrowDownRight, UserCheck,
  CalendarDays, CreditCard, Activity, PieChart,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useCanSeeProfit } from "@/components/admin/AdminLayout";
import { format } from "date-fns";
import { formatBDT, formatTrackingId } from "@/lib/utils";

interface Props {
  bookings: any[];
  payments: any[];
  expenses?: any[];
  accounts?: any[];
  financialSummary?: any;
  moallemPayments?: any[];
  supplierPayments?: any[];
  commissionPayments?: any[];
  moallems?: any[];
  supplierAgents?: any[];
  supplierContracts?: any[];
  supplierContractPayments?: any[];
  dailyCashbook?: any[];
  onMarkPaid: (id: string) => void;
}

const AdminDashboardCharts = ({
  bookings, payments, expenses = [], accounts = [],
  moallemPayments = [], supplierPayments = [], commissionPayments = [],
  moallems = [], supplierContracts = [], supplierContractPayments = [],
  dailyCashbook = [],
}: Props) => {
  const navigate = useNavigate();
  const canSeeProfit = useCanSeeProfit();
  const [showDueCustomers, setShowDueCustomers] = useState(false);

  const financials = useMemo(() => {
    const activeBookings = bookings.filter(b => b.status !== "cancelled");
    const totalSales = activeBookings.reduce((s, b) => s + Number(b.total_amount || 0), 0);
    const totalHajji = activeBookings.reduce((s, b) => s + Number(b.num_travelers || 0), 0);

    const customerPaymentsIn = payments
      .filter(p => p.status === "completed")
      .reduce((s, p) => s + Number(p.amount || 0), 0);
    const moallemDepositsIn = moallemPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const cashbookIncome = dailyCashbook
      .filter(e => e.type === "income")
      .reduce((s, e) => s + Number(e.amount || 0), 0);
    const totalIncomeReceived = customerPaymentsIn + moallemDepositsIn + cashbookIncome;

    const bookingProfit = activeBookings.reduce((s, b) => {
      const selling = Number(b.total_amount || 0);
      const cost = Number(b.total_cost || 0);
      const commission = Number(b.total_commission || 0);
      const extra = Number(b.extra_expense || 0);
      return s + (selling - cost - commission - extra);
    }, 0);
    const generalExpenses = expenses
      .filter(e => !e.booking_id)
      .reduce((s, e) => s + Number(e.amount || 0), 0);
    const cashbookExpense = dailyCashbook
      .filter(e => e.type === "expense")
      .reduce((s, e) => s + Number(e.amount || 0), 0);
    const netProfit = bookingProfit - generalExpenses - cashbookExpense;

    const getWalletBalance = (name: string) => {
      const acc = accounts.find(a => a.type === "asset" && String(a.name || "").trim().toLowerCase() === name.toLowerCase());
      return Number(acc?.balance || 0);
    };
    const cashBalance = getWalletBalance("Cash");
    const bankBalance = getWalletBalance("Bank");
    const bkashBalance = getWalletBalance("bKash");
    const nagadBalance = getWalletBalance("Nagad");

    const moallemDue = moallems.reduce((s, m) => s + Number(m.total_due || 0), 0);
    const customerDue = activeBookings.reduce((s, b) => s + Number(b.due_amount || 0), 0);
    const totalReceivable = moallemDue + customerDue;

    const bookingSupplierDue = activeBookings.reduce((s, b) => s + Number(b.supplier_due || 0), 0);
    const contractSupplierDue = supplierContracts.reduce((s, c) => s + Number(c.total_due || 0), 0);
    const supplierDue = bookingSupplierDue + contractSupplierDue;
    const commissionDue = activeBookings.reduce((s, b) => s + Number(b.commission_due || 0), 0);
    const totalPayable = supplierDue + commissionDue;

    // Today's stats
    const today = format(new Date(), "yyyy-MM-dd");
    const todayBookings = activeBookings.filter(b => format(new Date(b.created_at), "yyyy-MM-dd") === today).length;
    const todayPayments = payments.filter(p => p.status === "completed" && p.paid_at && format(new Date(p.paid_at), "yyyy-MM-dd") === today)
      .reduce((s, p) => s + Number(p.amount || 0), 0);

    // Status breakdown
    const pendingCount = activeBookings.filter(b => b.status === "pending").length;
    const completedCount = activeBookings.filter(b => b.status === "completed" || b.status === "confirmed").length;
    const cancelledCount = bookings.filter(b => b.status === "cancelled").length;

    // Service-type breakdown
    const workPermitCount = activeBookings.filter(b => b.service_type === "work_permit").length;
    const visaCount = activeBookings.filter(b => b.service_type === "visa").length;
    const ticketCount = activeBookings.filter(b => b.service_type === "air_ticket").length;
    const totalCustomers = new Set(
      activeBookings.map(b => b.guest_phone || b.user_id || b.guest_name).filter(Boolean)
    ).size;

    return {
      totalSales, totalHajji, totalIncomeReceived, netProfit,
      cashBalance, bankBalance, bkashBalance, nagadBalance,
      moallemDue, customerDue, totalReceivable,
      supplierDue, commissionDue, totalPayable,
      todayBookings, todayPayments,
      pendingCount, completedCount, cancelledCount,
      workPermitCount, visaCount, ticketCount, totalCustomers,
    };
  }, [bookings, payments, expenses, accounts, moallemPayments, supplierPayments, commissionPayments, supplierContractPayments, supplierContracts, moallems, dailyCashbook]);

  const dueCustomers = useMemo(() => {
    const map: Record<string, { name: string; phone: string; totalDue: number; totalAmount: number; bookingCount: number; bookings: any[] }> = {};
    bookings.filter(b => b.status !== "cancelled" && Number(b.due_amount || 0) > 0).forEach(b => {
      const key = b.guest_phone || b.guest_name || b.tracking_id;
      if (!map[key]) {
        map[key] = { name: b.guest_name || "N/A", phone: b.guest_phone || "", totalDue: 0, totalAmount: 0, bookingCount: 0, bookings: [] };
      }
      map[key].totalDue += Number(b.due_amount || 0);
      map[key].totalAmount += Number(b.total_amount || 0);
      map[key].bookingCount += 1;
      map[key].bookings.push(b);
    });
    return Object.values(map).sort((a, b) => b.totalDue - a.totalDue);
  }, [bookings]);

  const totalWallet = financials.cashBalance + financials.bankBalance + financials.bkashBalance + financials.nagadBalance;
  const recentBookings = bookings.slice(0, 6);
  const recentPayments = payments.filter(p => p.status === "completed").slice(0, 6);

  const walletItems = [
    { label: "Cash", value: financials.cashBalance, color: "bg-emerald-500" },
    { label: "Bank", value: financials.bankBalance, color: "bg-blue-500" },
    { label: "bKash", value: financials.bkashBalance, color: "bg-pink-500" },
    { label: "Nagad", value: financials.nagadBalance, color: "bg-orange-500" },
  ];

  return (
    <div className="space-y-5">
      {/* ═══ ROW 1: PRIMARY KPIs ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Total Sales"
          value={formatBDT(financials.totalSales)}
          icon={DollarSign}
          iconBg="bg-primary/10"
          iconColor="text-primary"
          sub={`${bookings.filter(b => b.status !== "cancelled").length} applications`}
          onClick={() => navigate("/admin/work-permit")}
        />
        <KpiCard
          label="Income Received"
          value={formatBDT(financials.totalIncomeReceived)}
          icon={ArrowUpRight}
          iconBg="bg-emerald-500/10"
          iconColor="text-emerald-500"
          sub={`Today: ${formatBDT(financials.todayPayments)}`}
          onClick={() => navigate("/admin/payments")}
        />
        {canSeeProfit && (
          <KpiCard
            label="Net Profit"
            value={formatBDT(financials.netProfit)}
            icon={TrendingUp}
            iconBg={financials.netProfit >= 0 ? "bg-emerald-500/10" : "bg-destructive/10"}
            iconColor={financials.netProfit >= 0 ? "text-emerald-500" : "text-destructive"}
            sub="After all expenses"
            onClick={() => navigate("/admin/accounting")}
          />
        )}
        <KpiCard
          label="Customer Due"
          value={formatBDT(financials.customerDue)}
          icon={UserCheck}
          iconBg="bg-yellow-500/10"
          iconColor="text-yellow-600"
          sub={`${dueCustomers.length} customers`}
          onClick={() => setShowDueCustomers(true)}
        />
      </div>

      {/* ═══ ROW 2: WALLET + STATS ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Wallet Overview */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" /> Wallet Overview
            </h3>
            <p className={`text-xl font-bold tabular-nums ${totalWallet >= 0 ? "text-primary" : "text-destructive"}`}>
              {formatBDT(totalWallet)}
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {walletItems.map(w => (
              <div
                key={w.label}
                className="bg-secondary/40 rounded-lg p-3 cursor-pointer hover:bg-secondary/70 transition-colors"
                onClick={() => navigate("/admin/accounting")}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2.5 h-2.5 rounded-full ${w.color}`} />
                  <span className="text-xs text-muted-foreground">{w.label}</span>
                </div>
                <p className={`text-base font-bold tabular-nums ${w.value >= 0 ? "text-foreground" : "text-destructive"}`}>
                  {formatBDT(w.value)}
                </p>
              </div>
            ))}
          </div>
          {/* Wallet bar visualization */}
          {totalWallet > 0 && (
            <div className="mt-4 h-3 rounded-full bg-secondary/50 overflow-hidden flex">
              {walletItems.filter(w => w.value > 0).map(w => (
                <div
                  key={w.label}
                  className={`${w.color} opacity-80 transition-all`}
                  style={{ width: `${(w.value / totalWallet) * 100}%` }}
                  title={`${w.label}: ${formatBDT(w.value)}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Quick Stats
          </h3>
          <div className="space-y-3">
            <QuickStat label="Total Customers" value={financials.totalCustomers} color="text-primary" onClick={() => navigate("/admin/customers")} />
            <QuickStat label="Today's Applications" value={financials.todayBookings} color="text-emerald-500" onClick={() => navigate("/admin/work-permit")} />
            <QuickStat label="Work Permit Applications" value={financials.workPermitCount} color="text-primary" onClick={() => navigate("/admin/work-permit")} />
            <QuickStat label="Visa Applications" value={financials.visaCount} color="text-primary" onClick={() => navigate("/admin/visa")} />
            <QuickStat label="Air Ticket Sales" value={financials.ticketCount} color="text-primary" onClick={() => navigate("/admin/tickets")} />
            <QuickStat label="Pending Applications" value={financials.pendingCount} color="text-yellow-600" />
            <QuickStat label="Completed Applications" value={financials.completedCount} color="text-emerald-500" />
            <QuickStat label="Cancelled Applications" value={financials.cancelledCount} color="text-destructive" />
          </div>
        </div>
      </div>

      {/* ═══ ROW 3: RECENT BOOKINGS & PAYMENTS ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Bookings */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" /> Recent Applications
            </h3>
            <span className="text-xs text-primary cursor-pointer hover:underline font-medium" onClick={() => navigate("/admin/work-permit")}>View All →</span>
          </div>
          {recentBookings.length > 0 ? (
            <div className="space-y-1">
              {recentBookings.map(b => (
                <div
                  key={b.id}
                  className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0 cursor-pointer hover:bg-secondary/20 rounded-lg px-2 -mx-2 transition-colors"
                  onClick={() => {
                    const r = b.service_type === "visa" ? "/admin/visa"
                      : b.service_type === "air_ticket" ? "/admin/tickets"
                      : "/admin/work-permit";
                    navigate(r);
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{b.guest_name || "N/A"}</p>
                    <p className="text-[11px] text-muted-foreground">{formatTrackingId(b.tracking_id)} · {b.packages?.name || ""}</p>
                  </div>
                  <div className="text-right ml-3 shrink-0">
                    <p className="text-sm font-bold text-primary tabular-nums">{formatBDT(Number(b.total_amount || 0))}</p>
                    <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      b.status === "confirmed" ? "bg-emerald-500/10 text-emerald-600" :
                      b.status === "cancelled" ? "bg-destructive/10 text-destructive" :
                      "bg-yellow-500/10 text-yellow-600"
                    }`}>{b.status}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No applications yet</p>
          )}
        </div>

        {/* Recent Payments */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-500" /> Recent Payments
            </h3>
            <span className="text-xs text-primary cursor-pointer hover:underline font-medium" onClick={() => navigate("/admin/payments")}>View All →</span>
          </div>
          {recentPayments.length > 0 ? (
            <div className="space-y-1">
              {recentPayments.map(p => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0 cursor-pointer hover:bg-secondary/20 rounded-lg px-2 -mx-2 transition-colors"
                  onClick={() => navigate("/admin/payments")}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{formatTrackingId(p.bookings?.tracking_id) || p.id.slice(0, 8)}</p>
                    <p className="text-[11px] text-muted-foreground">#{p.installment_number || 1} · {p.payment_method || "cash"}</p>
                  </div>
                  <div className="text-right ml-3 shrink-0">
                    <p className="text-sm font-bold text-emerald-500 tabular-nums">{formatBDT(Number(p.amount || 0))}</p>
                    <p className="text-[10px] text-muted-foreground">{p.paid_at ? format(new Date(p.paid_at), "dd MMM yy") : ""}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No payments yet</p>
          )}
        </div>
      </div>

      {/* ═══ DUE CUSTOMERS DIALOG ═══ */}
      <Dialog open={showDueCustomers} onOpenChange={setShowDueCustomers}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              Due Customer List
              <span className="text-sm font-normal text-muted-foreground ml-2">({dueCustomers.length} customers)</span>
            </DialogTitle>
          </DialogHeader>
          {dueCustomers.length > 0 ? (
            <div className="space-y-2 mt-2">
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-center justify-between">
                <span className="text-sm font-medium">Total Due</span>
                <span className="text-lg font-bold text-destructive">{formatBDT(financials.customerDue)}</span>
              </div>
              {dueCustomers.map((c, i) => (
                <div key={i} className="bg-secondary/30 border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold">{c.name}</p>
                      {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-destructive">{formatBDT(c.totalDue)}</p>
                      <p className="text-[10px] text-muted-foreground">{c.bookingCount} bookings</p>
                    </div>
                  </div>
                  <div className="space-y-1 mt-2 border-t border-border pt-2">
                    {c.bookings.map((b: any) => (
                      <div key={b.id} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{formatTrackingId(b.tracking_id)} · {b.packages?.name || ""}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground">Total: {formatBDT(Number(b.total_amount))}</span>
                          <span className="font-semibold text-destructive">Due: {formatBDT(Number(b.due_amount))}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No dues 🎉</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ─── Reusable KPI Card ─── */
function KpiCard({ label, value, icon: Icon, iconBg, iconColor, sub, onClick }: {
  label: string; value: string; icon: any; iconBg: string; iconColor: string; sub: string; onClick: () => void;
}) {
  return (
    <div
      className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all group"
      onClick={onClick}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center`}>
          <Icon className={`h-4.5 w-4.5 ${iconColor}`} />
        </div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
      </div>
      <p className={`text-xl font-bold tabular-nums ${iconColor}`}>{value}</p>
      <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}

/* ─── Quick Stat Row ─── */
function QuickStat({ label, value, color, onClick }: { label: string; value: number; color: string; onClick?: () => void }) {
  return (
    <div
      className={`flex items-center justify-between py-2 px-2 -mx-2 rounded-lg transition-colors ${onClick ? "hover:bg-secondary/30 cursor-pointer" : ""}`}
      onClick={onClick}
    >
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-base font-bold tabular-nums ${color}`}>{value}</span>
    </div>
  );
}

export default AdminDashboardCharts;
