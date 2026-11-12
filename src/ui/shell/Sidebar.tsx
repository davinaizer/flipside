"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { FOCUS_RING, PRESSED } from "@/ui/button/button-class";
import { Icon, Logo, type IconName } from "@/ui/icons/Icon";
import { ProfileMenu } from "./ProfileMenu";
import { readCollapsed, subscribeCollapsed, writeCollapsed } from "./sidebar-state";

const SECTIONS: { href: string; label: string; icon: IconName; match: string[] }[] = [
  { href: "/library", label: "Library", icon: "library", match: ["/library", "/decks", "/import"] },
  { href: "/progress", label: "Progress", icon: "progress", match: ["/progress"] },
];

/** An overlay left open would cover the page a link just opened (W3). */
function closeOverlay() {
  if (window.matchMedia("(max-width: 639px)").matches) writeCollapsed(true);
}

/** Deck pages belong to the Library, so the Library stays highlighted there (README item 16). */
export function Sidebar({ name, avatar }: { name: string; avatar: string }) {
  // The server snapshot is expanded, so hydration matches; the remembered choice applies right after.
  const collapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false);
  return <SidebarView name={name} avatar={avatar} collapsed={collapsed} />;
}

/**
 * Below 640 px the expanded sidebar is fixed over the page (the spacer keeps the rail's width), and the top
 * bar rises above it so the toggle stays reachable; the logo row drops below the toggle. From 640 px it is
 * a sticky column that pushes the content.
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
    <>
      {/* Below 640 px the aside floats over the page, so this spacer keeps the rail's width in the layout (W3). */}
      <div aria-hidden className="w-[calc(5rem+env(safe-area-inset-left))] shrink-0 sm:hidden" />
      <aside
        className={`fixed left-0 top-0 z-30 flex h-screen shrink-0 sm:sticky sm:z-auto flex-col justify-between bg-surface-container-low safe-area safe-t safe-b safe-l [--edge:1rem] transition-[width] duration-200 ease-out motion-reduce:transition-none ${collapsed ? "w-[calc(5rem+env(safe-area-inset-left))]" : "w-[calc(16rem+env(safe-area-inset-left))]"}`}
      >
        <div className="flex flex-col gap-6">
          <div
            className={`flex items-center gap-3 overflow-hidden whitespace-nowrap pt-2 ${collapsed ? "justify-center" : "px-2 max-sm:mt-12"}`}
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
                      onClick={closeOverlay}
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
    </>
  );
}
