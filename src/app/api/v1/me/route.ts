import { toErrorResponse } from "@/server/http/errors";
import { readJson } from "@/server/http/parse";
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
    const body = await readJson(request);
    return Response.json(toMe(await updateProfile(profile.id, body)));
  } catch (e) {
    return toErrorResponse(e);
  }
}
