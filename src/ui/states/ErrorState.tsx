import Link from "next/link";
import { buttonClass } from "@/ui/button/button-class";

/** README item 13: plain language, no codes; Retry reloads. Offers Switch profile too. */
export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="flex max-w-lg flex-col gap-4">
      <h1 className="text-3xl font-semibold">We can&apos;t reach the home server</h1>
      <p className="text-on-surface-variant">
        Your cards and progress are safe. Check that you are on the home Wi-Fi, then try again.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onRetry}
          className={buttonClass("primary")}
        >
          Retry
        </button>
        <Link
          href="/?switch=1"
          className={buttonClass("secondary")}
        >
          Switch profile
        </Link>
      </div>
    </div>
  );
}
