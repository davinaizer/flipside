import { handle } from "@/server/http/handle";
import { readJson } from "@/server/http/parse";
import { toMe, updateProfile } from "@/server/profile";

export const dynamic = "force-dynamic";

export const GET = handle(async ({ profile }) => Response.json(toMe(profile)));

export const PATCH = handle(async ({ request, profile }) => {
  const body = await readJson(request);
  return Response.json(toMe(await updateProfile(profile.id, body)));
});
