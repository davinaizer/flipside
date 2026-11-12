import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { profileFromCookies } from "@/server/profile";
import { ProfileScreen } from "@/ui/profile/ProfileScreen";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const profile = await profileFromCookies(await cookies());
  if (!profile) redirect("/");
  return <ProfileScreen name={profile.name} avatar={profile.avatar} />;
}
