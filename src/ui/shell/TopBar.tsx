import { ThemeToggle } from "@/ui/settings/ThemeToggle";

/** Top bar of the app shell: the theme switch only, no product title. The profile avatar and menu live in the sidebar (P6). */
export function TopBar() {
  return (
    <header className="flex items-center justify-end gap-4 px-8 pt-4">
      <ThemeToggle />
    </header>
  );
}
