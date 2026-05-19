import DataListPage from "@/components/admin/DataListPage";

export default function AdminCmsNewPage() {
  return (
    <DataListPage
      title="CMS Sections"
      subtitle="All frontend content is stored here"
      endpoint="/cms-sections"
      columns={[
        { key: "page", label: "Page" },
        { key: "section_key", label: "Section" },
        { key: "title", label: "Title" },
        { key: "is_active", label: "Active", render: (r) => (r.is_active !== false ? "Yes" : "No") },
      ]}
    />
  );
}