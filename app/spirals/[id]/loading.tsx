export default function SpiralLoading() {
  return (
    <div aria-busy="true" className="space-y-8">
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Loading the spiral</p>
        <div className="h-9 w-1/2 rounded-md border border-border bg-card" />
        <div className="h-5 w-1/3 rounded-md border border-border bg-card" />
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="aspect-square w-full max-w-[360px] rounded-md border border-border bg-card" />
        <div className="h-96 rounded-md border border-border bg-card" />
      </div>
    </div>
  );
}
