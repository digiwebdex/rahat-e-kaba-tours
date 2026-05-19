import DataListPage from "@/components/admin/DataListPage";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { downloadApplicationInvoice } from "@/lib/applicationInvoicePdf";
import { toast } from "sonner";
import { useState } from "react";
import { api } from "@/lib/api";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

const STATUS_OPTIONS = [
  "pending", "submitted", "in_review", "approved", "rejected", "completed", "cancelled",
];

function StatusChanger({ row, onChanged }: { row: any; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const change = async (status: string) => {
    if (status === row.status) return;
    setBusy(true);
    try {
      await api.post(`/applications/${row.id}/status`, { status });
      toast.success(`Status updated to ${status}`);
      onChanged();
    } catch (e: any) {
      toast.error(e?.message || "Failed to update status");
    } finally {
      setBusy(false);
    }
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" disabled={busy}>{row.status || "pending"}</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {STATUS_OPTIONS.map((s) => (
          <DropdownMenuItem key={s} onClick={() => change(s)} disabled={s === row.status}>
            {s}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-600",
    approved: "bg-emerald-500/10 text-emerald-600",
    rejected: "bg-destructive/10 text-destructive",
    completed: "bg-primary/10 text-primary",
    cancelled: "bg-muted text-muted-foreground",
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[s] || "bg-muted text-muted-foreground"}`}>{s || "pending"}</span>;
};

export default function AdminApplicationsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <DataListPage
      key={refreshKey}
      title="Applications"
      subtitle="All Work Permit, Air Ticket and Visa applications"
      endpoint="/applications"
      emptyMessage="No applications yet. Customers can apply from the public site."
      columns={[
        { key: "tracking_id", label: "Tracking ID" },
        { key: "service", label: "Service", render: (r) => r.service?.name_en || r.service_code },
        { key: "customer", label: "Customer", render: (r) => r.customer?.full_name || "—" },
        { key: "phone", label: "Phone", render: (r) => r.customer?.phone || "—" },
        { key: "total_amount", label: "Total (BDT)", render: (r) => Number(r.total_amount || 0).toLocaleString("en-IN") },
        { key: "due_amount", label: "Due (BDT)", render: (r) => Number(r.due_amount || 0).toLocaleString("en-IN") },
        { key: "status", label: "Status", render: (r) => <StatusChanger row={r} onChanged={() => setRefreshKey((k) => k + 1)} /> },
        { key: "created_at", label: "Created", render: (r) => new Date(r.created_at).toLocaleDateString() },
        {
          key: "_actions",
          label: "",
          render: (r) => (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  await downloadApplicationInvoice(r.id);
                } catch (e: any) {
                  toast.error(e?.message || "Failed to generate invoice");
                }
              }}
            >
              <FileText className="h-3.5 w-3.5 mr-1" /> Invoice
            </Button>
          ),
        },
      ]}
    />
  );
}