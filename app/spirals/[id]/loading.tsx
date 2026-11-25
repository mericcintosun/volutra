import { RouteSkeleton } from "@/components/route-states";

export default function SpiralDetailSkeleton() {
  return (
    <RouteSkeleton label="Loading the spiral">
      <div className="h-5 w-1/3 rounded-md border border-border bg-card" />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="aspect-square w-full max-w-[360px] rounded-md border border-border bg-card" />
        <div className="h-96 rounded-md border border-border bg-card" />
      </div>
    </RouteSkeleton>
  );
}
