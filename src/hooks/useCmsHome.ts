import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";

export type CmsHomeSections = Record<string, any>;

export function useCmsHome() {
  const [sections, setSections] = useState<CmsHomeSections>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    apiClient
      .get("/public/cms/home")
      .then((d) => setSections(d && typeof d === "object" ? d : {}))
      .catch(() => setSections({}))
      .finally(() => setLoaded(true));
  }, []);

  return { sections, loaded };
}