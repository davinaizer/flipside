import { errorResponse, toErrorResponse } from "@/server/http/errors";
import { getCurrentProfile, toMe, updateProfile } from "@/server/profile";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  try {
    return Response.json(toMe(await getCurrentProfile(request)));
  } catch (e) {
    return toErrorResponse(e);
  }
}

export async function PATCH(request: Request): Promise<Response> {
  try {
    const profile = await getCurrentProfile(request);
    const body: unknown = await request.json().catch(() => undefined);
    if (body === undefined) return errorResponse(400, "invalid_json", "The body must be JSON.");
    return Response.json(toMe(await updateProfile(profile.id, body)));
  } catch (e) {
    return toErrorResponse(e);
  }
}
