import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PROFILE_COOKIE, profileFromCookie } from "@/server/profile";
import { readSettings } from "@/server/settings";
import { SettingsProvider } from "@/ui/settings/SettingsProvider";
import { Sidebar } from "@/ui/shell/Sidebar";
import { TopBar } from "@/ui/shell/TopBar";

export const dynamic = "force-dynamic";

/** Every screen inside the app shell needs a profile; without one the picker is the only way in. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await profileFromCookie((await cookies()).get(PROFILE_COOKIE)?.value);
  if (!profile) redirect("/");
  return (
    <SettingsProvider key={profile.id} initial={readSettings(profile.settings)}>
      <div className="flex min-h-screen bg-surface text-on-surface">
        <Sidebar name={profile.name} avatar={profile.avatar} />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar name={profile.name} avatar={profile.avatar} />
          <main className="flex-1 p-8">{children}</main>
        </div>
      </div>
    </SettingsProvider>
  );
}
