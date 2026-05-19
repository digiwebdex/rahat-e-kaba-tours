import DataListPage from "@/components/admin/DataListPage";

export default function AdminPaymentMethodsNewPage() {
  return (
    <DataListPage
      title="Payment Methods"
      subtitle="Configure online and manual payment methods"
      endpoint="/payment-methods"
      columns={[
        { key: "name", label: "Name" },
        { key: "kind", label: "Kind" },
        { key: "provider", label: "Provider" },
        { key: "instructions", label: "Instructions" },
        { key: "is_active", label: "Active", render: (r) => (r.is_active ? "Yes" : "No") },
      ]}
    />
  );
}