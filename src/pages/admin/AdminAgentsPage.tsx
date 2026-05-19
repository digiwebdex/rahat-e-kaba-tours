import DataListPage from "@/components/admin/DataListPage";

export default function AdminAgentsPage() {
  return (
    <DataListPage
      title="Agents"
      subtitle="Referral agents and supplier agents"
      endpoint="/agents"
      emptyMessage="No agents yet."
      columns={[
        { key: "name", label: "Name" },
        { key: "company_name", label: "Company" },
        { key: "kind", label: "Type", render: (r) => (
          <span className="capitalize text-xs px-2 py-0.5 rounded bg-muted">{r.kind}</span>
        ) },
        { key: "phone", label: "Phone" },
        { key: "email", label: "Email" },
        { key: "commission", label: "Commission", render: (r) => `${r.commission_value ?? 0} ${r.commission_type === 'percent' ? '%' : 'BDT'}` },
        { key: "status", label: "Status" },
      ]}
    />
  );
}