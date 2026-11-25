"use client";

import { ErrorState } from "@/components/route-states";

export default function OverviewError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorState
      title="The overview could not be drawn"
      body="Your saved readings are untouched. They live in this browser's storage, not on this page."
      onRetry={reset}
    />
  );
}
