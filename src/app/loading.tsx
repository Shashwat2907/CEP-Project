export default function Loading() {
  return (
    <div className="w-full h-full p-4 md:p-6 space-y-6 animate-pulse">
      {/* Page header skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-48 bg-surface-sunken rounded-sm" />
        <div className="h-4 w-72 bg-surface-sunken rounded-sm" />
      </div>

      {/* Metric / status chips skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-24 bg-surface border border-border rounded-md p-4 space-y-2"
          >
            <div className="h-3 w-16 bg-surface-sunken rounded-sm" />
            <div className="h-6 w-24 bg-surface-sunken rounded-sm" />
          </div>
        ))}
      </div>

      {/* Main card skeleton */}
      <div className="h-64 bg-surface border border-border rounded-md p-6 space-y-4">
        <div className="h-5 w-40 bg-surface-sunken rounded-sm" />
        <div className="h-4 w-full bg-surface-sunken rounded-sm" />
        <div className="h-4 w-5/6 bg-surface-sunken rounded-sm" />
        <div className="h-4 w-2/3 bg-surface-sunken rounded-sm" />
      </div>
    </div>
  )
}
