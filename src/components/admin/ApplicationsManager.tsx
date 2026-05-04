import { useEffect, useState } from "react";
import { supabase } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, Search, Briefcase, GraduationCap, Phone, Mail, MapPin, Calendar, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link } from "react-router-dom";

type ServiceType = "work_permit" | "student_consultancy";

interface Props {
  serviceType: ServiceType;
}

const STATUS_OPTIONS = [
  { value: "pending", label: "New", color: "bg-blue-100 text-blue-700" },
  { value: "contacted", label: "Contacted", color: "bg-purple-100 text-purple-700" },
  { value: "processing", label: "Processing", color: "bg-amber-100 text-amber-700" },
  { value: "approved", label: "Approved", color: "bg-emerald-100 text-emerald-700" },
  { value: "completed", label: "Completed", color: "bg-green-100 text-green-700" },
  { value: "rejected", label: "Rejected", color: "bg-red-100 text-red-700" },
  { value: "cancelled", label: "Cancelled", color: "bg-gray-100 text-gray-700" },
];

const statusBadge = (status: string) => {
  const s = STATUS_OPTIONS.find(o => o.value === status) || STATUS_OPTIONS[0];
  return <Badge className={`${s.color} border-0`}>{s.label}</Badge>;
};

export default function ApplicationsManager({ serviceType }: Props) {
  const isWP = serviceType === "work_permit";
  const Icon = isWP ? Briefcase : GraduationCap;
  const title = isWP ? "Fiji Work Permit Applications" : "Student Consultancy Applications";

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<any | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("service_type", serviceType)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) toast.error(error.message);
    else setRows(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [serviceType]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Status updated");
    setRows(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    if (selected?.id === id) setSelected({ ...selected, status });
  };

  const updateAmount = async (id: string, total_amount: number) => {
    const { error } = await supabase.from("bookings").update({ total_amount }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Service fee updated");
    setRows(prev => prev.map(r => r.id === id ? { ...r, total_amount } : r));
    if (selected?.id === id) setSelected({ ...selected, total_amount });
  };

  const filtered = rows.filter(r => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [r.guest_name, r.guest_phone, r.guest_email, r.tracking_id]
      .some(v => v?.toString().toLowerCase().includes(q));
  });

  const counts = STATUS_OPTIONS.reduce((acc, s) => {
    acc[s.value] = rows.filter(r => r.status === s.value).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-ocean text-white flex items-center justify-center">
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">{title}</h1>
            <p className="text-sm text-muted-foreground">{rows.length} total applications</p>
          </div>
        </div>
      </div>

      {/* Pipeline counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
        {STATUS_OPTIONS.map(s => (
          <button
            key={s.value}
            onClick={() => setStatusFilter(statusFilter === s.value ? "all" : s.value)}
            className={`p-3 rounded-lg border text-left transition ${statusFilter === s.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
          >
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className="text-2xl font-bold tabular-nums">{counts[s.value] || 0}</div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name, phone, email, tracking ID..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border border-border rounded-xl overflow-hidden bg-card">
        {loading ? (
          <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No applications found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase">
              <tr>
                <th className="text-left p-3">Tracking ID</th>
                <th className="text-left p-3">Applicant</th>
                <th className="text-left p-3">Phone</th>
                <th className="text-left p-3">{isWP ? "Position" : "Country / Program"}</th>
                <th className="text-left p-3">Fee (BDT)</th>
                <th className="text-left p-3">Paid</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Created</th>
                <th className="text-right p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const ad = r.application_data || {};
                return (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs text-primary">{r.tracking_id}</td>
                    <td className="p-3 font-medium">{r.guest_name || "—"}</td>
                    <td className="p-3">{r.guest_phone || "—"}</td>
                    <td className="p-3">{isWP ? ad.position : `${ad.country || ""} · ${ad.program || ""}`}</td>
                    <td className="p-3 tabular-nums">{Number(r.total_amount || 0).toLocaleString()}</td>
                    <td className="p-3 tabular-nums text-emerald-600">{Number(r.paid_amount || 0).toLocaleString()}</td>
                    <td className="p-3">{statusBadge(r.status)}</td>
                    <td className="p-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="p-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => setSelected(r)}>View</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-primary" />
                  {selected.guest_name}
                  <span className="text-xs font-mono text-muted-foreground ml-auto">{selected.tracking_id}</span>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{selected.guest_phone}</div>
                  <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />{selected.guest_email || "—"}</div>
                  <div className="flex items-center gap-2 col-span-2"><MapPin className="h-4 w-4 text-muted-foreground" />{selected.guest_address || "—"}</div>
                  <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" />Passport: {selected.guest_passport || "—"}</div>
                  <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" />{new Date(selected.created_at).toLocaleString()}</div>
                </div>

                <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
                  <h4 className="font-semibold text-sm">Application Details</h4>
                  {Object.entries(selected.application_data || {}).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-sm">
                      <span className="text-muted-foreground capitalize">{k.replace(/_/g, " ")}</span>
                      <span className="font-medium">{String(v) || "—"}</span>
                    </div>
                  ))}
                </div>

                {selected.notes && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                    <div className="font-semibold mb-1">Applicant Notes</div>
                    {selected.notes}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Pipeline Status</label>
                    <Select value={selected.status} onValueChange={(v) => updateStatus(selected.id, v)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Service Fee (BDT)</label>
                    <Input
                      type="number"
                      defaultValue={selected.total_amount || 0}
                      onBlur={(e) => updateAmount(selected.id, Number(e.target.value) || 0)}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t">
                  <Link to={`/admin/bookings`} className="flex-1">
                    <Button variant="outline" className="w-full">Manage Payments / Invoice</Button>
                  </Link>
                  <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
