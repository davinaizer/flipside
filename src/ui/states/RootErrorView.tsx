import { AttributeThemeSwitch } from "@/ui/settings/AttributeThemeSwitch";
import { ErrorState } from "./ErrorState";

/** Root error page body: a top-right theme switch (T6) above ErrorState. No SettingsProvider here. */
export function RootErrorView({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="bg-surface">
      <div className="flex justify-end px-6 pt-4 md:px-8">
        <AttributeThemeSwitch />
      </div>
      <div className="p-8">
        <ErrorState onRetry={onRetry} />
      </div>
    </main>
  );
}
