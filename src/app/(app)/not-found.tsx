import Link from "next/link";
import { buttonClass } from "@/ui/button/button-class";

export default function NotFound() {
  return (
    <div className="flex max-w-lg flex-col gap-4">
      <h1 className="text-3xl font-semibold">We can&apos;t find that deck</h1>
      <p className="text-on-surface-variant">It may have been removed, or it belongs to someone else.</p>
      <Link
        href="/library"
        className={buttonClass("primary", { extra: "w-fit" })}
      >
        Back to Library
      </Link>
    </div>
  );
}
