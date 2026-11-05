import { toErrorResponse } from "@/server/http/errors";
import { readJson } from "@/server/http/parse";
import { createProfile, listProfiles, toMe } from "@/server/profile";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return Response.json({ profiles: await listProfiles() });
}

// Behind the app password like every route (the proxy answers 401); no profile cookie is needed.
export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readJson(request);
    return Response.json(toMe(await createProfile(body)).profile, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
}
