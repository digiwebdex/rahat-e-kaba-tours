import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, Plane, FileCheck, ArrowRight, Loader2 } from "lucide-react";
import { Helmet } from "react-helmet-async";

const ICONS: Record<string, any> = {
  work_permit: Briefcase,
  air_ticket: Plane,
  visa: FileCheck,
};

export default function ServicesListPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get("/public/services").then((d) => setServices(d || [])).finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Helmet>
        <title>Our Services — Al Rawsha International</title>
        <meta name="description" content="Apply online for Overseas Work Permit, Air Ticket and Visa Processing services with Al Rawsha." />
      </Helmet>
      <main className="min-h-screen bg-background py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Our Services</h1>
            <p className="text-muted-foreground">Apply online in minutes. Upload documents securely. Pay online or manually.</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {services.map((s) => {
                const Icon = ICONS[s.code] || Briefcase;
                return (
                  <Card key={s.code} className="p-6 hover:shadow-lg transition-shadow border-border/60">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-semibold mb-1">{s.name_en}</h3>
                    {s.name_bn && <p className="text-sm text-muted-foreground mb-3">{s.name_bn}</p>}
                    <p className="text-sm text-muted-foreground mb-6 min-h-[3rem]">
                      {s.description || "Fast, transparent, and reliable processing handled end-to-end."}
                    </p>
                    <Button asChild className="w-full">
                      <Link to={`/apply/${s.code.replace(/_/g, '-')}`}>
                        Apply Now <ArrowRight className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </>
  );
}