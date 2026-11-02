import { toErrorResponse } from "@/server/http/errors";
import { getCurrentProfile } from "@/server/profile";
import { getSummary } from "@/server/sessions";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Counts by grade, session time, cards to go again and the ids to practise as misses. */
export async function GET(request: Request, { params }: Ctx): Promise<Response> {
  try {
    const profile = await getCurrentProfile(request);
    return Response.json(await getSummary(profile, (await params).id));
  } catch (e) {
    return toErrorResponse(e);
  }
}
