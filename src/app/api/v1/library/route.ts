import { getLibrary } from "@/server/decks";
import { toErrorResponse } from "@/server/http/errors";
import { getCurrentProfile } from "@/server/profile";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  try {
    const profile = await getCurrentProfile(request);
    return Response.json(await getLibrary(profile.id));
  } catch (e) {
    return toErrorResponse(e);
  }
}
