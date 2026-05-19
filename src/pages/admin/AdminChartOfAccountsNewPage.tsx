import DataListPage from "@/components/admin/DataListPage";

export default function AdminChartOfAccountsNewPage() {
  return (
    <DataListPage
      title="Chart of Accounts"
      subtitle="Double-entry accounting ledger accounts"
      endpoint="/chart-of-accounts"
      columns={[
        { key: "code", label: "Code" },
        { key: "name", label: "Account Name" },
        { key: "type", label: "Type" },
        { key: "normal_balance", label: "Normal" },
      ]}
    />
  );
}