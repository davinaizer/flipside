import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PROFILE_COOKIE, profileFromCookie } from "@/server/profile";
import { Sidebar } from "@/ui/shell/Sidebar";

export const dynamic = "force-dynamic";

/** Every screen inside the app shell needs a profile; without one the picker is the only way in. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await profileFromCookie((await cookies()).get(PROFILE_COOKIE)?.value);
  if (!profile) redirect("/");
  return (
    <div className="flex min-h-screen bg-surface text-on-surface">
      <Sidebar name={profile.name} avatar={profile.avatar} />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
