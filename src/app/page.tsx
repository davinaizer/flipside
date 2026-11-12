import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { resolveHome } from "@/server/profile";
import { ProfilePicker } from "@/ui/profile/ProfilePicker";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ switch?: string | string[] }>;
}) {
  const [{ switch: sw }, jar] = await Promise.all([searchParams, cookies()]);
  const target = await resolveHome(jar, sw === "1");
  // A stale sign-in cookie passes the proxy; the token is checked here (AU6).
  if (target === "login") redirect("/login");
  if (target === "library") redirect("/library");
  return <ProfilePicker />;
}
