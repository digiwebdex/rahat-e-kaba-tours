import DataListPage from "@/components/admin/DataListPage";

export default function AdminWalletsPage() {
  return (
    <DataListPage
      title="Wallets"
      subtitle="Cash, bank and mobile money wallets"
      endpoint="/wallets"
      columns={[
        { key: "name", label: "Wallet" },
        { key: "type", label: "Type" },
        { key: "account_number", label: "Account #" },
        { key: "balance", label: "Balance (BDT)", render: (r) => (
          <span className="font-semibold tabular-nums">{Number(r.balance || 0).toLocaleString("en-IN")}</span>
        ) },
        { key: "is_active", label: "Active", render: (r) => (r.is_active ? "Yes" : "No") },
      ]}
    />
  );
}