import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { profileFromCookies } from "@/server/profile";
import { readSettings } from "@/server/settings";
import { SettingsProvider } from "@/ui/settings/SettingsProvider";
import { PracticeScreen } from "@/ui/practice/PracticeScreen";

export const dynamic = "force-dynamic";

/** Full screen, outside the app shell (no sidebar). Needs a profile for its reading settings. */
export default async function PracticePage({ params }: { params: Promise<{ sessionId: string }> }) {
  const profile = await profileFromCookies(await cookies());
  if (!profile) redirect("/");
  const { sessionId } = await params;
  const settings = readSettings(profile.settings);
  return (
    <main className="min-h-screen bg-surface text-on-surface">
      <SettingsProvider key={profile.id} initial={settings}>
        <PracticeScreen sessionId={sessionId} />
      </SettingsProvider>
    </main>
  );
}
