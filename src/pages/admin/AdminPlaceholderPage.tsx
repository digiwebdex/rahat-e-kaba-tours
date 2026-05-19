import { Card } from "@/components/ui/card";
import { Hammer } from "lucide-react";

interface Props { title: string; description: string; }

export default function AdminPlaceholderPage({ title, description }: Props) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{title}</h1>
      <Card className="p-10 text-center space-y-3">
        <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Hammer className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-lg font-semibold">Coming in the next phase</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">{description}</p>
      </Card>
    </div>
  );
}