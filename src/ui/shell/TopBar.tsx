import Link from "next/link";
import { Avatar } from "@/ui/avatars";
import { FOCUS_RING, PRESSED } from "@/ui/button/button-class";
import { ThemeToggle } from "@/ui/settings/ThemeToggle";

/** Top bar of the app shell: theme switch and profile avatar, no product title (the sidebar carries it). The avatar links to the Profile page (P6); it is named for the profile so screen readers hear who is signed in. */
export function TopBar({ name, avatar }: { name: string; avatar: string }) {
  return (
    <header className="flex items-center justify-end gap-4 px-8 pt-4">
      <ThemeToggle />
      <Link
        href="/profile"
        aria-label={`${name}, open profile`}
        className={`rounded-full hover:bg-surface-container-high active:bg-surface-container-highest ${PRESSED} ${FOCUS_RING}`}
      >
        <Avatar id={avatar} size={44} />
      </Link>
    </header>
  );
}
