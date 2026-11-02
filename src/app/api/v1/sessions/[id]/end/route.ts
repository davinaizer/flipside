import { toErrorResponse } from "@/server/http/errors";
import { getCurrentProfile } from "@/server/profile";
import { endSession } from "@/server/sessions";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Ends the session early; grades already given are kept. */
export async function POST(request: Request, { params }: Ctx): Promise<Response> {
  try {
    const profile = await getCurrentProfile(request);
    return Response.json(await endSession(profile, (await params).id));
  } catch (e) {
    return toErrorResponse(e);
  }
}
