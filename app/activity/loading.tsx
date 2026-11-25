import { RouteSkeleton } from "@/components/route-states";

export default function ActivitySkeleton() {
  return (
    <RouteSkeleton label="Loading the dose day">
      <div className="h-10 w-full rounded-md border border-border bg-card" />
      <div className="h-80 rounded-md border border-border bg-card" />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="h-64 rounded-md border border-border bg-card" />
        <div className="h-64 rounded-md border border-border bg-card" />
      </div>
    </RouteSkeleton>
  );
}
