import { Avatar } from "@/ui/avatars";
import { ThemeToggle } from "@/ui/settings/ThemeToggle";

/** Top bar of the app shell: theme switch and profile avatar, no product title (the sidebar carries it). The avatar is a plain slot until F10 makes it a menu. */
export function TopBar({ avatar }: { avatar: string }) {
  return (
    <header className="flex items-center justify-end gap-4 px-8 pt-4">
      <ThemeToggle />
      <Avatar id={avatar} size={44} />
    </header>
  );
}
