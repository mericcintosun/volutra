"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Card className="mx-auto mt-16 max-w-lg border-bad/60">
      <CardContent className="space-y-4 py-12 text-center">
        <p className="font-display text-xl font-semibold">Volutra</p>
        <h2 className="text-2xl font-semibold">This screen hit an error</h2>
        <p className="text-sm text-muted-foreground">Your saved readings are untouched. They live in this browser&apos;s storage, not on this page.</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button onClick={() => reset()}>Try again</Button>
          <Button asChild variant="outline">
            <Link href="/">Back to the overview</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
