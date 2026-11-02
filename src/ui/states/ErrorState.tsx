import Link from "next/link";
import { Icon } from "@/ui/icons/Icon";
import { buttonClass } from "@/ui/button/button-class";

/** README item 13: plain language, no codes; Retry reloads. Offers Switch profile too. */
export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex max-w-lg flex-col items-center gap-4 rounded-card border border-card-edge bg-surface-card p-8 text-center shadow-card"
    >
      <span aria-hidden="true" className="flex size-16 items-center justify-center rounded-full bg-surface-container-high text-primary">
        <Icon name="wifiOff" size={32} />
      </span>
      <h1 className="text-headline-lg font-semibold">We can&apos;t reach the home server</h1>
      <p className="text-on-surface-variant">
        Your cards and progress are safe. Check that you are on the home Wi-Fi, then try again.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" onClick={onRetry} className={buttonClass("primary")}>
          <Icon name="refresh" />
          Retry
        </button>
        <Link href="/?switch=1" className={buttonClass("secondary")}>
          <Icon name="switchProfile" />
          Switch profile
        </Link>
      </div>
    </div>
  );
}
