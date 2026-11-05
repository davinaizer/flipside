import { handleOpen } from "@/server/http/handle";
import { readJson } from "@/server/http/parse";
import { createProfile, listProfiles, toMe } from "@/server/profile";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return Response.json({ profiles: await listProfiles() });
}

// Behind the app password like every route (the proxy answers 401); no profile cookie is needed.
export const POST = handleOpen(async (request) => {
  const body = await readJson(request);
  return Response.json(toMe(await createProfile(body)).profile, { status: 201 });
});
