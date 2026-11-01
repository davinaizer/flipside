import { ReadingSettings } from "@/ui/settings/reading/ReadingSettings";

export default function SettingsPage() {
  return (
    <>
      <h1 className="text-4xl font-semibold">Settings</h1>
      <div className="mt-8">
        <ReadingSettings />
      </div>
    </>
  );
}
