import { toErrorResponse } from "@/server/http/errors";
import { readJson } from "@/server/http/parse";
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
    const body = await readJson(request);
    return Response.json({ settings: await saveSettings(profile.id, body) });
  } catch (e) {
    return toErrorResponse(e);
  }
}
