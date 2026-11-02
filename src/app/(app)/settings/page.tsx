import { PracticeSettings } from "@/ui/settings/practice/PracticeSettings";
import { ReadingSettings } from "@/ui/settings/reading/ReadingSettings";

export default function SettingsPage() {
  return (
    <>
      <h1 className="text-headline-lg font-semibold">Settings</h1>
      <p className="text-on-surface-variant">Choose how cards look and how practice runs. Changes save as you make them.</p>
      <div className="mt-8">
        <ReadingSettings />
      </div>
      <PracticeSettings />
    </>
  );
}
