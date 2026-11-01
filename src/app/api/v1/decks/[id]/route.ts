import { getDeck } from "@/server/decks";
import { toErrorResponse } from "@/server/http/errors";
import { getCurrentProfile } from "@/server/profile";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const profile = await getCurrentProfile(request);
    return Response.json(await getDeck(profile.id, (await params).id));
  } catch (e) {
    return toErrorResponse(e);
  }
}
