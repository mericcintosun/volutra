"use client";

import { ErrorState } from "@/components/route-states";

export default function SpiralsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorState
      title="The spiral list could not be drawn"
      body="The records and your saved readings are unchanged. Try again, or go back to the overview."
      onRetry={reset}
    />
  );
}
