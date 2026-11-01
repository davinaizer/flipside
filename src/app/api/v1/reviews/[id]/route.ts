import { errorResponse, toErrorResponse } from "@/server/http/errors";
import { getCurrentProfile } from "@/server/profile";
import { putReview } from "@/server/reviews";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Records a grade from {sessionId, cardId, grade, durationMs}; a retry with the same id returns the original. */
export async function PUT(request: Request, { params }: Ctx): Promise<Response> {
  try {
    const profile = await getCurrentProfile(request);
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(400, "invalid_json", "The body must be JSON.");
    }
    return Response.json(await putReview(profile, (await params).id, body));
  } catch (e) {
    return toErrorResponse(e);
  }
}
