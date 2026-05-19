import DataListPage from "@/components/admin/DataListPage";

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
  return (
    <DataListPage
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
        { key: "status", label: "Status", render: (r) => statusBadge(r.status) },
        { key: "created_at", label: "Created", render: (r) => new Date(r.created_at).toLocaleDateString() },
      ]}
    />
  );
}