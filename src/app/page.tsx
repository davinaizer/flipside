import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PROFILE_COOKIE, resolveHome } from "@/server/profile";
import { ProfilePicker } from "@/ui/profile/ProfilePicker";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ switch?: string | string[] }>;
}) {
  const [{ switch: sw }, jar] = await Promise.all([searchParams, cookies()]);
  const target = await resolveHome(jar.get(PROFILE_COOKIE)?.value, sw === "1");
  if (target === "library") redirect("/library");
  return <ProfilePicker />;
}
