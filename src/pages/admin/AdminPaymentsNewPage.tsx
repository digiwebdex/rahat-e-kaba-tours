import DataListPage from "@/components/admin/DataListPage";

export default function AdminPaymentsNewPage() {
  return (
    <DataListPage
      title="Payments"
      subtitle="All received payments"
      endpoint="/payments"
      emptyMessage="No payments yet."
      columns={[
        { key: "payment_date", label: "Date", render: (r) => new Date(r.payment_date || r.created_at).toLocaleDateString() },
        { key: "amount", label: "Amount (BDT)", render: (r) => Number(r.amount || 0).toLocaleString("en-IN") },
        { key: "method", label: "Method" },
        { key: "status", label: "Status" },
        { key: "reference", label: "Reference" },
      ]}
    />
  );
}