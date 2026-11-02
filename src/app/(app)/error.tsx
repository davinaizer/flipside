"use client";

import { ErrorState } from "@/ui/states/ErrorState";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return <ErrorState onRetry={reset} />;
}
