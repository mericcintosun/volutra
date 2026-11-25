"use client";

import { ErrorState } from "@/components/route-states";

export default function SpiralDetailError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorState
      title="This spiral could not be replayed"
      body="The recording or the pad hit an error. Nothing was saved or lost; try again to reload the spiral."
      onRetry={reset}
    />
  );
}
