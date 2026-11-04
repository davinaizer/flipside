import { errorResponse, toErrorResponse } from "@/server/http/errors";
import { createProfile, listProfiles, toMe } from "@/server/profile";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return Response.json({ profiles: await listProfiles() });
}

// Behind the app password like every route (the proxy answers 401); no profile cookie is needed.
export async function POST(request: Request): Promise<Response> {
  try {
    const body: unknown = await request.json().catch(() => undefined);
    if (body === undefined) return errorResponse(400, "invalid_json", "The body must be JSON.");
    return Response.json(toMe(await createProfile(body)).profile, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
}
