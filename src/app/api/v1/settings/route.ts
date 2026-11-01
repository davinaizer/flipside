import { errorResponse, toErrorResponse } from "@/server/http/errors";
import { getCurrentProfile } from "@/server/profile";
import { readSettings, saveSettings } from "@/server/settings";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  try {
    const profile = await getCurrentProfile(request);
    return Response.json({ settings: readSettings(profile.settings) });
  } catch (e) {
    return toErrorResponse(e);
  }
}

export async function PUT(request: Request): Promise<Response> {
  try {
    const profile = await getCurrentProfile(request);
    const body: unknown = await request.json().catch(() => undefined);
    if (body === undefined) return errorResponse(400, "invalid_json", "The body must be JSON.");
    return Response.json({ settings: await saveSettings(profile.id, body) });
  } catch (e) {
    return toErrorResponse(e);
  }
}
