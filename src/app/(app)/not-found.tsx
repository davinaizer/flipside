import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex max-w-lg flex-col gap-4">
      <h1 className="text-3xl font-semibold">We can&apos;t find that deck</h1>
      <p className="text-on-surface-variant">It may have been removed, or it belongs to someone else.</p>
      <Link
        href="/library"
        className="flex min-h-11 w-fit items-center rounded-full bg-primary px-8 text-on-primary"
      >
        Back to Library
      </Link>
    </div>
  );
}
