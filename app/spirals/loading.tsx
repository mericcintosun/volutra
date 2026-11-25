export default function SpiralsLoading() {
  return (
    <div aria-busy="true" className="space-y-8">
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Loading the spiral records</p>
        <div className="h-9 w-1/2 rounded-md border border-border bg-card" />
      </div>
      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-4">
          <div className="h-9 w-full rounded-md border border-border bg-card" />
          <div className="divide-y divide-border rounded-md border border-border bg-card">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16" />
            ))}
          </div>
        </div>
        <div className="h-72 rounded-md border border-border bg-card" />
      </div>
    </div>
  );
}
