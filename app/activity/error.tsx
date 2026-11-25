"use client";

import { ErrorState } from "@/components/route-states";

export default function ActivityError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorState
      title="The dose day could not be drawn"
      body="Your saved readings are still in this browser. Try again, or go back to the overview."
      onRetry={reset}
    />
  );
}
