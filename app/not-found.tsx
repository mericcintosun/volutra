import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <Card className="mx-auto mt-16 max-w-lg border-dashed">
      <CardContent className="space-y-4 py-12 text-center">
        <p className="font-display text-xl font-semibold">Volutra</p>
        <h2 className="text-2xl font-semibold">No spiral here</h2>
        <p className="text-sm text-muted-foreground">That record does not exist in this diary. It may have been a local drawing from another browser.</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild variant="outline">
            <Link href="/spirals">Back to all spirals</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Back to the overview</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
