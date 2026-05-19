import { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface Section {
  id: string;
  page: string;
  section_key: string;
  content: Record<string, any>;
  is_visible: boolean;
  sort_order: number;
}

const HERO_FIELDS: { key: string; label: string; type?: "textarea" }[] = [
  { key: "image_url", label: "Background Image URL" },
  { key: "alt", label: "Image Alt Text" },
  { key: "badge_en", label: "Badge (English)" },
  { key: "badge_bn", label: "Badge (Bengali)" },
  { key: "title_en", label: "Title (English)" },
  { key: "title_bn", label: "Title (Bengali)" },
  { key: "subtitle_en", label: "Subtitle (English)", type: "textarea" },
  { key: "subtitle_bn", label: "Subtitle (Bengali)", type: "textarea" },
];

function SectionCard({ section, onSaved }: { section: Section; onSaved: () => void }) {
  const [content, setContent] = useState<Record<string, any>>(section.content || {});
  const [visible, setVisible] = useState(section.is_visible);
  const [saving, setSaving] = useState(false);
  const [rawMode, setRawMode] = useState(false);
  const [raw, setRaw] = useState(() => JSON.stringify(section.content || {}, null, 2));

  const isHero = section.section_key === "hero";

  const save = async () => {
    setSaving(true);
    try {
      let payload = content;
      if (rawMode) {
        try {
          payload = JSON.parse(raw || "{}");
        } catch {
          toast.error("Invalid JSON");
          setSaving(false);
          return;
        }
      }
      await apiClient.patch(`/cms-sections/${section.id}`, {
        content: payload,
        is_visible: visible,
      });
      toast.success(`Saved "${section.section_key}"`);
      onSaved();
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold capitalize">{section.section_key.replace(/_/g, " ")}</h3>
          <p className="text-xs text-muted-foreground">Order: {section.sort_order}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            {visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
            <Switch checked={visible} onCheckedChange={setVisible} />
          </div>
          {isHero && (
            <Button variant="ghost" size="sm" onClick={() => setRawMode((r) => !r)}>
              {rawMode ? "Form" : "JSON"}
            </Button>
          )}
        </div>
      </div>

      {isHero && !rawMode ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {HERO_FIELDS.map((f) => (
            <div key={f.key} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
              <Label className="text-xs">{f.label}</Label>
              {f.type === "textarea" ? (
                <Textarea
                  rows={2}
                  value={content[f.key] || ""}
                  onChange={(e) => setContent({ ...content, [f.key]: e.target.value })}
                />
              ) : (
                <Input
                  value={content[f.key] || ""}
                  onChange={(e) => setContent({ ...content, [f.key]: e.target.value })}
                />
              )}
            </div>
          ))}
          {content.image_url ? (
            <div className="sm:col-span-2">
              <Label className="text-xs">Preview</Label>
              <img
                src={content.image_url}
                alt="preview"
                className="mt-1 w-full max-h-40 object-cover rounded border"
              />
            </div>
          ) : null}
        </div>
      ) : (
        <Textarea
          rows={8}
          className="font-mono text-xs"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
        />
      )}

      <div className="flex justify-end">
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
          Save
        </Button>
      </div>
    </Card>
  );
}

export default function CmsHomeEditor() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setLoading(true);
    apiClient
      .get("/cms-sections")
      .then((r) => {
        const arr: Section[] = Array.isArray(r) ? r : [];
        setSections(arr.filter((s) => s.page === "home").sort((a, b) => a.sort_order - b.sort_order));
      })
      .catch((e) => toast.error(e?.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, [tick]);

  const refresh = () => setTick((t) => t + 1);

  const heroFirst = useMemo(
    () => [...sections].sort((a, b) => (a.section_key === "hero" ? -1 : b.section_key === "hero" ? 1 : 0)),
    [sections],
  );

  if (loading) {
    return (
      <div className="p-10 flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading sections…
      </div>
    );
  }

  if (!sections.length) {
    return <p className="text-sm text-muted-foreground">No homepage sections configured.</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-heading text-lg font-bold">Homepage Editor</h3>
        <p className="text-xs text-muted-foreground">
          Edit hero slide and toggle visibility for each homepage section. Changes appear instantly on the public site.
        </p>
      </div>
      {heroFirst.map((s) => (
        <SectionCard key={s.id} section={s} onSaved={refresh} />
      ))}
    </div>
  );
}