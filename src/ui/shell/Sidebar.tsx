"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "@/ui/avatars";

const SECTIONS = [
  { href: "/library", label: "Library", match: ["/library", "/decks", "/import"] },
  { href: "/progress", label: "Progress", match: ["/progress"] },
  { href: "/settings", label: "Settings", match: ["/settings"] },
];

/** Deck pages belong to the Library, so the Library stays highlighted there (README item 16). */
export function Sidebar({ name, avatar }: { name: string; avatar: string }) {
  const path = usePathname();
  return (
    <aside className="flex w-60 shrink-0 flex-col justify-between bg-surface-container-low p-4">
      <nav aria-label="Main">
        <ul className="flex flex-col gap-2">
          {SECTIONS.map((s) => {
            const current = s.match.some((m) => path === m || path.startsWith(`${m}/`));
            return (
              <li key={s.href}>
                <Link
                  href={s.href}
                  aria-current={current ? "page" : undefined}
                  className={`flex min-h-11 items-center rounded-full px-4 font-semibold ${
                    current
                      ? "bg-primary-container text-on-primary-container"
                      : "text-on-surface hover:bg-surface-container-high"
                  }`}
                >
                  {s.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Avatar id={avatar} size={44} />
          <span className="font-semibold">{name}</span>
        </div>
        <Link
          href="/?switch=1"
          className="flex min-h-11 items-center rounded-full px-4 text-on-surface hover:bg-surface-container-high"
        >
          Switch profile
        </Link>
      </div>
    </aside>
  );
}
