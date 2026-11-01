"use client";

import { ErrorState } from "@/ui/states/ErrorState";

/**
 * Catches what (app)/error.tsx cannot: an error boundary never covers its own
 * segment's layout, so a throw in the (app) layout or on / (e.g. database
 * unreachable) lands here.
 */
export default function RootError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="p-8">
      <ErrorState onRetry={reset} />
    </main>
  );
}
