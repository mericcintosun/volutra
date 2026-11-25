import { RouteSkeleton } from "@/components/route-states";

export default function OverviewSkeleton() {
  return (
    <RouteSkeleton label="Loading the diary">
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,3fr)]">
        <div className="aspect-[4/3] rounded-md border border-border bg-card" />
        <div className="space-y-6">
          <div className="h-56 rounded-md border border-border bg-card" />
          <div className="h-16 rounded-md border border-border bg-card" />
        </div>
      </div>
    </RouteSkeleton>
  );
}
