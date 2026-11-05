import { ThemeToggle } from "@/ui/settings/ThemeToggle";
import { SidebarToggle } from "./SidebarToggle";

/** Top bar of the app shell: sidebar toggle on the left, theme switch on the right, no product title. The profile avatar and menu live in the sidebar (P6). */
export function TopBar() {
  return (
    <header className="flex items-center justify-between gap-4 px-8 pt-4">
      <SidebarToggle />
      <ThemeToggle />
    </header>
  );
}
