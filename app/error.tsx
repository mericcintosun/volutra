"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <Card className="mx-auto mt-16 max-w-lg border-bad/60">
      <CardContent className="space-y-4 py-12 text-center">
        <h2 className="text-2xl font-semibold">This screen hit an error</h2>
        <p className="text-sm text-muted-foreground">Your saved readings are untouched. They live in this browser&apos;s storage, not on this page.</p>
        <Button onClick={() => reset()}>Try again</Button>
      </CardContent>
    </Card>
  );
}
