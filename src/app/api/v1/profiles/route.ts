import { listProfiles } from "@/server/profile";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return Response.json({ profiles: await listProfiles() });
}
