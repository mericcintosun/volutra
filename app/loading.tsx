export default function OverviewLoading() {
  return (
    <div aria-busy="true" className="space-y-8">
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Loading the diary</p>
        <div className="h-9 w-2/3 rounded-md border border-border bg-card" />
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="aspect-[4/3] rounded-md border border-border bg-card" />
        <div className="space-y-6">
          <div className="h-56 rounded-md border border-border bg-card" />
          <div className="h-16 rounded-md border border-border bg-card" />
        </div>
      </div>
    </div>
  );
}
