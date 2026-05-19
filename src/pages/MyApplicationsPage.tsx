import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Helmet } from "react-helmet-async";

export default function MyApplicationsPage() {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    apiClient.get("/my/applications")
      .then((d) => setApps(d || []))
      .catch((e) => {
        if (String(e.message).includes("Session")) navigate("/auth");
        else setError(e.message);
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  return (
    <>
      <Helmet><title>My Applications — Al Rawsha</title></Helmet>
      <main className="min-h-screen bg-background py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="text-3xl font-bold mb-6">My Applications</h1>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : error ? (
            <Card className="p-6 text-destructive text-sm">{error}</Card>
          ) : apps.length === 0 ? (
            <Card className="p-10 text-center space-y-3">
              <p className="text-muted-foreground">You haven't submitted any applications yet.</p>
              <Button asChild><Link to="/services">Browse Services</Link></Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {apps.map((a) => (
                <Card key={a.id} className="p-5 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{a.tracking_id}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary capitalize">{a.status}</span>
                    </div>
                    <p className="font-medium">{a.service_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Total BDT {Number(a.total_amount).toLocaleString("en-IN")} ·
                      Due BDT {Number(a.due_amount).toLocaleString("en-IN")} ·
                      {new Date(a.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/track?id=${a.tracking_id}`}>View</Link>
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}