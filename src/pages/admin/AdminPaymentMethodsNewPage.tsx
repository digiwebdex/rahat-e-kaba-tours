import DataListPage from "@/components/admin/DataListPage";

export default function AdminPaymentMethodsNewPage() {
  return (
    <DataListPage
      title="Payment Methods"
      subtitle="Configure online and manual payment methods"
      endpoint="/payment-methods"
      columns={[
        { key: "code", label: "Code" },
        { key: "name", label: "Name" },
        { key: "type", label: "Type" },
        { key: "requires_proof", label: "Needs Proof", render: (r) => (r.requires_proof ? "Yes" : "No") },
        { key: "is_online", label: "Online", render: (r) => (r.is_online ? "Yes" : "No") },
        { key: "is_active", label: "Active", render: (r) => (r.is_active ? "Yes" : "No") },
      ]}
    />
  );
}