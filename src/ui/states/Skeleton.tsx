/** Loading placeholder: grey blocks instead of a spinner over text (PRD section 8). */
export function Skeleton({ className = "h-6 w-full" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-xl bg-surface-container-high ${className}`} />;
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
