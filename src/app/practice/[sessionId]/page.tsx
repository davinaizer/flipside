import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PROFILE_COOKIE, profileFromCookie } from "@/server/profile";
import { readSettings } from "@/server/settings";
import { PracticeScreen } from "@/ui/practice/PracticeScreen";

export const dynamic = "force-dynamic";

/** Full screen, outside the app shell (no sidebar). Needs a profile for its reading settings. */
export default async function PracticePage({ params }: { params: Promise<{ sessionId: string }> }) {
  const profile = await profileFromCookie((await cookies()).get(PROFILE_COOKIE)?.value);
  if (!profile) redirect("/");
  const { sessionId } = await params;
  const s = readSettings(profile.settings);
  return (
    <main className="min-h-screen bg-surface text-on-surface">
      <PracticeScreen
        sessionId={sessionId}
        settings={{ font: s.font, textSize: s.textSize, letterSpacing: s.letterSpacing, lineSpacing: s.lineSpacing, cardColor: s.cardColor }}
        speech={{ autoRead: s.readAloud, speed: s.readingSpeed }}
      />
    </main>
  );
}
