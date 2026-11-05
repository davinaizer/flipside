/** Loading placeholder: grey blocks instead of a spinner over text (PRD section 8). */
export function Skeleton({ className = "h-6 w-full" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-xl bg-surface-container-high ${className}`}
    />
  );
}

export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="flex flex-col gap-4">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-24 w-full max-w-2xl" />
      <Skeleton className="h-24 w-full max-w-2xl" />
    </div>
  );
}

/** Same shape as the Library (title row, Today panel, deck cards) so the page does not jump when it loads. */
export function LibrarySkeleton() {
  return (
    <div role="status" aria-label="Loading" className="flex flex-col gap-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-40 w-full max-w-6xl rounded-card" />
      <div className="grid max-w-6xl gap-4 md:grid-cols-2">
        <Skeleton className="h-36 rounded-card" />
        <Skeleton className="h-36 rounded-card" />
        <Skeleton className="h-36 rounded-card" />
        <Skeleton className="h-36 rounded-card" />
      </div>
    </div>
  );
}
