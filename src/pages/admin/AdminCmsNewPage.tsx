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
        { key: "content", label: "Content Preview", render: (r) => {
          try {
            const c = typeof r.content === 'string' ? JSON.parse(r.content) : r.content;
            const txt = c?.title || c?.heading || c?.text || JSON.stringify(c || {});
            return <span className="text-xs text-muted-foreground line-clamp-1 max-w-xs inline-block">{String(txt).slice(0, 80)}</span>;
          } catch { return "—"; }
        } },
        { key: "is_visible", label: "Visible", render: (r) => (r.is_visible ? "Yes" : "No") },
        { key: "updated_at", label: "Updated", render: (r) => new Date(r.updated_at).toLocaleDateString() },
      ]}
    />
  );
}