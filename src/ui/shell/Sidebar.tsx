"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "@/ui/avatars";
import { buttonClass, FOCUS_RING, PRESSED } from "@/ui/button/button-class";
import { Icon, Logo, type IconName } from "@/ui/icons/Icon";

const SECTIONS: { href: string; label: string; icon: IconName; match: string[] }[] = [
  { href: "/library", label: "Library", icon: "library", match: ["/library", "/decks", "/import"] },
  { href: "/progress", label: "Progress", icon: "progress", match: ["/progress"] },
  { href: "/settings", label: "Settings", icon: "settings", match: ["/settings"] },
];

/** Deck pages belong to the Library, so the Library stays highlighted there (README item 16). */
export function Sidebar({ name, avatar }: { name: string; avatar: string }) {
  const path = usePathname();
  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col justify-between bg-surface-container-low p-4">
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3 px-2 pt-2">
          <Logo />
          <span className="font-semibold text-headline-sm">Flipside</span>
        </div>
        <nav aria-label="Main">
          <ul className="flex flex-col gap-2">
            {SECTIONS.map((s) => {
              const current = s.match.some((m) => path === m || path.startsWith(`${m}/`));
              return (
                <li key={s.href}>
                  <Link
                    href={s.href}
                    aria-current={current ? "page" : undefined}
                    className={`flex min-h-11 items-center gap-3 rounded-full px-4 font-semibold ${PRESSED} ${FOCUS_RING} ${
                      current
                        ? "bg-primary-container text-on-primary-container active:bg-surface-container-highest"
                        : "text-on-surface hover:bg-surface-container-high active:bg-surface-container-highest"
                    }`}
                  >
                    <Icon name={s.icon} />
                    {s.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
      <div className="flex flex-col gap-3 rounded-card border border-card-edge bg-surface-card p-4 shadow-card">
        <div className="flex items-center gap-3">
          <Avatar id={avatar} size={44} />
          <span className="font-semibold">{name}</span>
        </div>
        <Link href="/?switch=1" className={buttonClass("secondary", { size: "compact", extra: "w-full whitespace-nowrap" })}>
          <Icon name="switchProfile" />
          Switch profile
        </Link>
      </div>
    </aside>
  );
}
