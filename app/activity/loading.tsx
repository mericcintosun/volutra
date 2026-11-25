export default function ActivityLoading() {
  return (
    <div aria-busy="true" className="space-y-8">
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Loading the dose day</p>
        <div className="h-9 w-1/3 rounded-md border border-border bg-card" />
      </div>
      <div className="h-10 w-full rounded-md border border-border bg-card" />
      <div className="h-80 rounded-md border border-border bg-card" />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="h-64 rounded-md border border-border bg-card" />
        <div className="h-64 rounded-md border border-border bg-card" />
      </div>
    </div>
  );
}
