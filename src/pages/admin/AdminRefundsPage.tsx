import { useEffect, useState, useMemo } from "react";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";
import { useIsViewer, useCanModifyFinancials } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import {
  RefreshCw, Plus, Search, RotateCcw, CheckCircle, XCircle,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { formatBDT } from "@/lib/utils";

const inputClass = "w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-muted text-muted-foreground",
};

export default function AdminRefundsPage() {
  const isViewer = useIsViewer();
  const canModify = useCanModifyFinancials();
  const [refunds, setRefunds] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [customers, setCustomers] = useState<Record<string, any>>({});
  const [wallets, setWallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Modals
  const [showAddRefund, setShowAddRefund] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState("");
  const [selectedPolicyId, setSelectedPolicyId] = useState("");
  const [refundForm, setRefundForm] = useState({
    refund_amount: 0,
    deduction_amount: 0,
    original_amount: 0,
    wallet_id: "",
    reason: "",
  });

  // Policy form
  const [policyForm, setPolicyForm] = useState({
    name: "", description: "", refund_type: "percentage", refund_value: 0,
    min_days_before_departure: 0, is_default: false,
  });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [ref, pol, apps, custs, wal] = await Promise.all([
        apiClient.get("/refunds"),
        apiClient.get("/cancellation_policies"),
        apiClient.get("/applications"),
        apiClient.get("/customers"),
        apiClient.get("/wallets"),
      ]);
      const custMap: Record<string, any> = {};
      (custs || []).forEach((c: any) => { custMap[c.id] = c; });
      setCustomers(custMap);
      setApplications((apps || []).filter((a: any) => a.status !== "cancelled" && Number(a.paid_amount || 0) > 0));
      setRefunds(ref || []);
      setPolicies((pol || []).filter((p: any) => p.is_active !== false));
      setWallets((wal || []).filter((w: any) => w.is_active !== false));
    } catch (e: any) {
      toast.error(e?.message || "Failed to load refunds");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  // When application changes, update original amount
  useEffect(() => {
    if (!selectedAppId) return;
    const a = applications.find((x: any) => x.id === selectedAppId);
    if (a) {
      const paid = Number(a.paid_amount || 0);
      setRefundForm(prev => ({ ...prev, original_amount: paid, refund_amount: paid, deduction_amount: 0 }));
    }
  }, [selectedAppId, applications]);

  // When policy changes, recalculate
  useEffect(() => {
    if (!selectedPolicyId || !refundForm.original_amount) return;
    const pol = policies.find((p: any) => p.id === selectedPolicyId);
    if (pol) {
      const orig = refundForm.original_amount;
      let deduction = pol.refund_type === "percentage"
        ? orig * (1 - Number(pol.refund_value) / 100)
        : Number(pol.refund_value);
      deduction = Math.min(deduction, orig);
      setRefundForm(prev => ({
        ...prev,
        deduction_amount: Math.round(deduction),
        refund_amount: Math.round(orig - deduction),
      }));
    }
  }, [selectedPolicyId, policies, refundForm.original_amount]);

  const handleCreateRefund = async () => {
    if (!selectedAppId) { toast.error("Please select an application"); return; }
    if (refundForm.refund_amount <= 0) { toast.error("Refund amount must be greater than 0"); return; }
    try {
      await apiClient.post("/refunds", {
        application_id: selectedAppId,
        policy_id: selectedPolicyId || null,
        refund_amount: refundForm.refund_amount,
        wallet_id: refundForm.wallet_id || null,
        reason: refundForm.reason,
      });
      toast.success("Refund request created");
      setShowAddRefund(false);
      resetForm();
      fetchAll();
    } catch (e: any) {
      toast.error(e?.message || "Failed to create refund");
    }
  };

  const handleApprove = async (r: any) => {
    if (!r.wallet_id) {
      const w = prompt("Select wallet ID to pay refund from:\n" + wallets.map(x => `${x.name}: ${x.id}`).join("\n"));
      if (!w) return;
      try {
        await apiClient.post(`/refunds/${r.id}/approve`, { wallet_id: w });
        toast.success("Refund approved and posted to ledger");
        fetchAll();
      } catch (e: any) { toast.error(e?.message || "Failed to approve"); }
      return;
    }
    try {
      await apiClient.post(`/refunds/${r.id}/approve`, {});
      toast.success("Refund approved and posted to ledger");
      fetchAll();
    } catch (e: any) { toast.error(e?.message || "Failed to approve"); }
  };

  const handleReject = async (r: any) => {
    const reason = prompt("Rejection reason:") || "";
    try {
      await apiClient.post(`/refunds/${r.id}/reject`, { reason });
      toast.success("Refund rejected");
      fetchAll();
    } catch (e: any) { toast.error(e?.message || "Failed to reject"); }
  };

  const handleSavePolicy = async () => {
    if (!policyForm.name) { toast.error("Please enter a name"); return; }
    try {
      await apiClient.post("/cancellation_policies", { ...policyForm, is_active: true });
      toast.success("Policy created");
      setPolicyForm({ name: "", description: "", refund_type: "percentage", refund_value: 0, min_days_before_departure: 0, is_default: false });
      fetchAll();
    } catch (e: any) { toast.error(e?.message || "Failed to save policy"); }
  };

  const resetForm = () => {
    setSelectedAppId("");
    setSelectedPolicyId("");
    setRefundForm({ refund_amount: 0, deduction_amount: 0, original_amount: 0, wallet_id: "", reason: "" });
  };

  const filteredRefunds = useMemo(() => {
    let list = refunds;
    if (filterStatus !== "all") list = list.filter((r: any) => r.status === filterStatus);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const appMap: Record<string, any> = {};
      applications.forEach(a => { appMap[a.id] = a; });
      list = list.filter((r: any) => {
        const app = appMap[r.application_id];
        const cust = customers[r.customer_id];
        return (
          app?.tracking_id?.toLowerCase().includes(q) ||
          cust?.full_name?.toLowerCase().includes(q) ||
          r.reason?.toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [refunds, filterStatus, searchQuery, applications, customers]);

  const stats = useMemo(() => ({
    total: refunds.length,
    pending: refunds.filter((r: any) => r.status === "pending").length,
    approved: refunds.filter((r: any) => r.status === "approved").length,
    totalRefunded: refunds.filter((r: any) => r.status === "approved").reduce((s: number, r: any) => s + Number(r.refund_amount), 0),
  }), [refunds]);

  if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw className="animate-spin h-6 w-6 text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Refunds & Cancellations</h1>
          <p className="text-sm text-muted-foreground">Manage booking cancellations and refunds</p>
        </div>
        {!isViewer && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowPolicyModal(true)}>
              <FileText className="h-4 w-4 mr-1" /> Manage Policies
            </Button>
            <Button size="sm" onClick={() => { resetForm(); setShowAddRefund(true); }}>
              <Plus className="h-4 w-4 mr-1" /> New Refund
            </Button>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total Refunds</p>
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Approved</p>
          <p className="text-2xl font-bold text-emerald-600">{stats.approved}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total Refunded</p>
          <p className="text-2xl font-bold text-destructive">{formatBDT(stats.totalRefunded)}</p>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input className={inputClass + " pl-9"} placeholder="Search by tracking ID, name..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <select className={inputClass + " w-auto"} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tracking</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Customer</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Original Amount</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Deduction</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Refund</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Wallet</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
              {!isViewer && <th className="text-center px-4 py-3 font-medium text-muted-foreground">Action</th>}
            </tr>
          </thead>
          <tbody>
            {filteredRefunds.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">No refunds found</td></tr>
            ) : filteredRefunds.map((r: any) => {
              const app = applications.find(a => a.id === r.application_id) || {};
              const cust = customers[r.customer_id] || {};
              const wallet = wallets.find(w => w.id === r.wallet_id);
              return (
                <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs">{app.tracking_id || "—"}</td>
                  <td className="px-4 py-3">{cust.full_name || "—"}</td>
                  <td className="px-4 py-3 text-right">{formatBDT(r.original_amount)}</td>
                  <td className="px-4 py-3 text-right text-destructive">{formatBDT(r.deduction_amount)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatBDT(r.refund_amount)}</td>
                  <td className="px-4 py-3 text-center text-xs">{wallet?.name || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge className={STATUS_COLORS[r.status] || ""}>{r.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs">{format(new Date(r.created_at), "dd/MM/yyyy")}</td>
                  {!isViewer && (
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-1 justify-center">
                        {r.status === "pending" && canModify && (
                          <>
                            <Button size="sm" variant="ghost" className="text-emerald-600 h-7 px-2" onClick={() => handleApprove(r)}>
                              <CheckCircle className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive h-7 px-2" onClick={() => handleReject(r)}>
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Refund Modal */}
      <Dialog open={showAddRefund} onOpenChange={setShowAddRefund}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Refund Request</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Select Application *</label>
              <select className={inputClass} value={selectedAppId} onChange={e => setSelectedAppId(e.target.value)}>
                <option value="">-- Select application --</option>
                {applications.map((a: any) => {
                  const cust = customers[a.customer_id];
                  return (
                    <option key={a.id} value={a.id}>
                      {a.tracking_id} — {cust?.full_name || "Unknown"} ({formatBDT(a.paid_amount)} paid)
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Cancellation Policy</label>
              <select className={inputClass} value={selectedPolicyId} onChange={e => setSelectedPolicyId(e.target.value)}>
                <option value="">-- Custom refund --</option>
                {policies.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.refund_type === "percentage" ? `${p.refund_value}%` : formatBDT(p.refund_value)})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Original Amount</label>
                <input className={inputClass} type="number" value={refundForm.original_amount} onChange={e => {
                  const v = Number(e.target.value);
                  setRefundForm(prev => ({ ...prev, original_amount: v, refund_amount: v - prev.deduction_amount }));
                }} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Deduction</label>
                <input className={inputClass} type="number" value={refundForm.deduction_amount} onChange={e => {
                  const v = Number(e.target.value);
                  setRefundForm(prev => ({ ...prev, deduction_amount: v, refund_amount: prev.original_amount - v }));
                }} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Refund Amount</label>
                <input className={inputClass + " font-bold"} type="number" value={refundForm.refund_amount} readOnly />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Pay From Wallet *</label>
                <select className={inputClass} value={refundForm.wallet_id} onChange={e => setRefundForm(prev => ({ ...prev, wallet_id: e.target.value }))}>
                  <option value="">-- Select wallet --</option>
                  {wallets.map((w: any) => <option key={w.id} value={w.id}>{w.name} ({formatBDT(w.balance)})</option>)}
                </select>
              </div>
              <div />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Reason</label>
              <textarea className={inputClass} rows={2} value={refundForm.reason} onChange={e => setRefundForm(prev => ({ ...prev, reason: e.target.value }))} placeholder="Enter cancellation reason..." />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddRefund(false)}>Cancel</Button>
              <Button onClick={handleCreateRefund}><RotateCcw className="h-4 w-4 mr-1" /> Create Refund</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Policy Modal */}
      <Dialog open={showPolicyModal} onOpenChange={setShowPolicyModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Cancellation Policy</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Existing policies */}
            {policies.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {policies.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                    <div>
                      <p className="font-medium text-sm">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.refund_type === "percentage" ? `${p.refund_value}% Refund` : `${formatBDT(p.refund_value)} flat deduction`}
                        {p.min_days_before_departure > 0 && ` • minimum ${p.min_days_before_departure} days before`}
                      </p>
                    </div>
                    {p.is_default && <Badge variant="secondary">Default</Badge>}
                  </div>
                ))}
              </div>
            )}

            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-semibold">Add new policy</p>
              <input className={inputClass} placeholder="Policy name" value={policyForm.name} onChange={e => setPolicyForm(prev => ({ ...prev, name: e.target.value }))} />
              <input className={inputClass} placeholder="Description (optional)" value={policyForm.description} onChange={e => setPolicyForm(prev => ({ ...prev, description: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <select className={inputClass} value={policyForm.refund_type} onChange={e => setPolicyForm(prev => ({ ...prev, refund_type: e.target.value }))}>
                  <option value="percentage">Percentage (%)</option>
                  <option value="flat">Flat amount</option>
                </select>
                <input className={inputClass} type="number" placeholder={policyForm.refund_type === "percentage" ? "Refund %" : "Deduction amount"} value={policyForm.refund_value} onChange={e => setPolicyForm(prev => ({ ...prev, refund_value: Number(e.target.value) }))} />
              </div>
              <div className="flex justify-end">
                <Button size="sm" onClick={handleSavePolicy}><Plus className="h-4 w-4 mr-1" /> Save Policy</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
