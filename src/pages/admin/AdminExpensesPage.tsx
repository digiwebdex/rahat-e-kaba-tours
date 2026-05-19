import DataListPage from "@/components/admin/DataListPage";

export default function AdminExpensesPage() {
  return (
    <DataListPage
      title="Expenses"
      subtitle="Operating expenses"
      endpoint="/expenses"
      emptyMessage="No expenses recorded."
      columns={[
        { key: "expense_date", label: "Date", render: (r) => new Date(r.expense_date).toLocaleDateString() },
        { key: "category", label: "Category" },
        { key: "description", label: "Description" },
        { key: "amount", label: "Amount (BDT)", render: (r) => Number(r.amount || 0).toLocaleString("en-IN") },
      ]}
    />
  );
}