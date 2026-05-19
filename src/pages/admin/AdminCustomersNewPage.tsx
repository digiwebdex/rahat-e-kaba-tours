import DataListPage from "@/components/admin/DataListPage";

export default function AdminCustomersNewPage() {
  return (
    <DataListPage
      title="Customers"
      subtitle="All registered customers and applicants"
      endpoint="/customers"
      emptyMessage="No customers yet."
      columns={[
        { key: "full_name", label: "Name" },
        { key: "phone", label: "Phone" },
        { key: "email", label: "Email" },
        { key: "nid_number", label: "NID" },
        { key: "passport_number", label: "Passport" },
        { key: "created_at", label: "Joined", render: (r) => new Date(r.created_at).toLocaleDateString() },
      ]}
    />
  );
}