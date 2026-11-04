"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/ui/avatars";
import { FOCUS_RING, PRESSED } from "@/ui/button/button-class";
import { Icon, type IconName } from "@/ui/icons/Icon";
import { logOut } from "@/ui/profile/sign-out";

const ITEM = "flex min-h-11 w-full items-center gap-3 rounded-full px-4 text-left font-semibold text-on-surface hover:bg-surface-container-high active:bg-surface-container-highest";

const LINKS: { href: string; label: string; icon: IconName }[] = [
  { href: "/profile", label: "Profile", icon: "user" },
  { href: "/settings", label: "Settings", icon: "settings" },
  { href: "/?switch=1", label: "Switch profile", icon: "switchProfile" },
];

/** Index of the item to focus after an arrow, Home or End key; null for any other key. */
export function nextItemIndex(key: string, current: number, count: number): number | null {
  if (key === "ArrowDown") return (current + 1) % count;
  if (key === "ArrowUp") return (current - 1 + count) % count;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return null;
}

/** The menu list, kept apart from the open/close state so it can be rendered open in a test. */
export function ProfileMenuItems({ path, onLogOut }: { path: string; onLogOut: () => void }) {
  return (
    <div
      role="menu"
      aria-label="Profile"
      className="absolute inset-x-0 bottom-full mb-2 flex flex-col gap-1 rounded-card border border-card-edge bg-surface-card p-2 shadow-card"
    >
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          role="menuitem"
          tabIndex={-1}
          aria-current={path === l.href ? "page" : undefined}
          className={`${ITEM} active:bg-surface-container-highest ${PRESSED} ${FOCUS_RING} ${path === l.href ? "bg-primary-container text-on-primary-container" : ""}`}
        >
          <Icon name={l.icon} />
          {l.label}
        </Link>
      ))}
      <button type="button" role="menuitem" tabIndex={-1} onClick={onLogOut} className={`${ITEM} ${PRESSED} ${FOCUS_RING}`}>
        <Icon name="logOut" />
        Log out
      </button>
    </div>
  );
}

/** Sidebar footer: avatar and name as one button that opens the profile menu (P3, P6, AG3). */
export function ProfileMenu({ name, avatar }: { name: string; avatar: string }) {
  const router = useRouter();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  const items = () => Array.from(root.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
  const close = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) trigger.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    items()[0]?.focus();
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) close(true);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === "Escape") {
      e.preventDefault();
      close(true);
      return;
    }
    const list = items();
    const i = nextItemIndex(e.key, list.indexOf(document.activeElement as HTMLElement), list.length);
    if (i !== null) {
      e.preventDefault();
      list[i]?.focus();
    }
  }

  return (
    <div
      ref={root}
      onKeyDown={onKeyDown}
      // Choosing any item closes the menu; the link navigates or Log out runs as usual.
      onClick={(e) => (e.target as HTMLElement).closest('[role="menuitem"]') && setOpen(false)}
      className="relative"
    >
      <button
        ref={trigger}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`flex min-h-11 w-full items-center gap-3 rounded-card border border-card-edge bg-surface-card p-3 text-left shadow-card ${PRESSED} ${FOCUS_RING}`}
      >
        <Avatar id={avatar} size={44} />
        <span className="font-semibold">{name}</span>
      </button>
      {open && <ProfileMenuItems path={path} onLogOut={() => logOut(router.push)} />}
    </div>
  );
}
