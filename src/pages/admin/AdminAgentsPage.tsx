import DataListPage from "@/components/admin/DataListPage";

export default function AdminAgentsPage() {
  return (
    <DataListPage
      title="Agents"
      subtitle="Referral agents and supplier agents"
      endpoint="/agents"
      emptyMessage="No agents yet."
      columns={[
        { key: "code", label: "Code" },
        { key: "full_name", label: "Name" },
        { key: "kind", label: "Type", render: (r) => (
          <span className="capitalize text-xs px-2 py-0.5 rounded bg-muted">{r.kind}</span>
        ) },
        { key: "phone", label: "Phone" },
        { key: "email", label: "Email" },
        { key: "commission_rate", label: "Commission %", render: (r) => r.commission_rate ?? "—" },
        { key: "status", label: "Status" },
      ]}
    />
  );
}