"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { FOCUS_RING, PRESSED } from "@/ui/button/button-class";
import { Icon, Logo, type IconName } from "@/ui/icons/Icon";
import { ProfileMenu } from "./ProfileMenu";
import { readCollapsed, subscribeCollapsed } from "./sidebar-state";

const SECTIONS: { href: string; label: string; icon: IconName; match: string[] }[] = [
  { href: "/library", label: "Library", icon: "library", match: ["/library", "/decks", "/import"] },
  { href: "/progress", label: "Progress", icon: "progress", match: ["/progress"] },
];

/** Deck pages belong to the Library, so the Library stays highlighted there (README item 16). */
export function Sidebar({ name, avatar }: { name: string; avatar: string }) {
  // The server snapshot is expanded, so hydration matches; the remembered choice applies right after.
  const collapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false);
  return <SidebarView name={name} avatar={avatar} collapsed={collapsed} />;
}

/**
 * Collapsed it is an icon rail: nav icons keep their name through aria-label and title (U4).
 * The toggle lives in the top bar. The width animates; labels are clipped (overflow-hidden, no wrap)
 * while it moves. The aside itself must not clip, because the profile menu opens wider than the rail.
 */
export function SidebarView({
  name,
  avatar,
  collapsed,
}: {
  name: string;
  avatar: string;
  collapsed: boolean;
}) {
  const path = usePathname();
  return (
    <aside
      className={`sticky top-0 flex h-screen shrink-0 flex-col justify-between bg-surface-container-low p-4 transition-[width] duration-200 ease-out motion-reduce:transition-none ${collapsed ? "w-20" : "w-64"}`}
    >
      <div className="flex flex-col gap-6">
        <div
          className={`flex items-center gap-3 overflow-hidden whitespace-nowrap pt-2 ${collapsed ? "justify-center" : "px-2"}`}
        >
          <Logo />
          {!collapsed && <span className="font-semibold text-headline-sm">Flipside</span>}
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
                    aria-label={collapsed ? s.label : undefined}
                    title={collapsed ? s.label : undefined}
                    className={`flex min-h-11 items-center gap-3 overflow-hidden whitespace-nowrap rounded-full font-semibold ${collapsed ? "justify-center" : "px-4"} ${PRESSED} ${FOCUS_RING} ${
                      current
                        ? "bg-primary-container text-on-primary-container active:bg-surface-container-highest"
                        : "text-on-surface hover:bg-surface-container-high active:bg-surface-container-highest"
                    }`}
                  >
                    <Icon name={s.icon} />
                    {!collapsed && s.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
      <ProfileMenu name={name} avatar={avatar} collapsed={collapsed} />
    </aside>
  );
}
