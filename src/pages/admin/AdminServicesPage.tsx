import DataListPage from "@/components/admin/DataListPage";

export default function AdminServicesPage() {
  return (
    <DataListPage
      title="Services"
      subtitle="Manage the three core services"
      endpoint="/services"
      columns={[
        { key: "code", label: "Code" },
        { key: "name_en", label: "Name (EN)" },
        { key: "name_bn", label: "Name (BN)" },
        { key: "base_price", label: "Base Price (BDT)", render: (r) => Number(r.base_price || 0).toLocaleString("en-IN") },
        { key: "is_active", label: "Active", render: (r) => (r.is_active ? "Yes" : "No") },
      ]}
    />
  );
}