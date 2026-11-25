import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// The state triad shared by the four routes: loading skeleton, error, empty.
// Matte SURFACE blocks only. No shimmer, no new keyframe.

/** The page frame while a route loads: a label, a title block, then the route's own blocks. */
export function RouteSkeleton({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-8">
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className="h-9 w-1/2 rounded-md border border-border bg-card" />
      </div>
      {children}
    </div>
  );
}

interface ErrorStateProps {
  title: string;
  body: string;
  onRetry: () => void;
}

/** A route error with a retry and a way back to the overview. */
export function ErrorState({ title, body, onRetry }: ErrorStateProps) {
  return (
    <Card role="alert" className="mx-auto mt-16 max-w-lg border-bad/60">
      <CardContent className="space-y-4 py-12 text-center">
        <p className="font-display text-xl font-semibold">Volutra</p>
        <h2 className="font-display text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{body}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button onClick={() => onRetry()}>Try again</Button>
          <Button asChild variant="outline">
            <Link href="/">Back to the overview</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface EmptyStateProps {
  title: string;
  body: ReactNode;
  /** optional recovery link (for example "Clear filters"); drawing is always the rail's job */
  href?: string;
  cta?: string;
}

/** Nothing to show yet: a dashed LINE border, one sentence, and at most one recovery link. */
export function EmptyState({ title, body, href, cta }: EmptyStateProps) {
  return (
    <div className="space-y-3 rounded-md border border-dashed border-border px-6 py-10 text-center">
      <p className="font-display text-lg font-semibold">{title}</p>
      <p className="mx-auto max-w-[52ch] text-sm text-muted-foreground">{body}</p>
      {href && cta && (
        <Button asChild variant="outline">
          <Link href={href}>{cta}</Link>
        </Button>
      )}
    </div>
  );
}
