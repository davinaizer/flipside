import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PROFILE_COOKIE, profileFromCookie } from "@/server/profile";
import { ProfileScreen } from "@/ui/profile/ProfileScreen";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const profile = await profileFromCookie((await cookies()).get(PROFILE_COOKIE)?.value);
  if (!profile) redirect("/");
  return <ProfileScreen name={profile.name} avatar={profile.avatar} />;
}
