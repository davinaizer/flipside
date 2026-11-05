import { errorResponse, toErrorResponse } from "@/server/http/errors";
import { getCurrentProfile } from "@/server/profile";
import { getStats } from "@/server/stats";
import { statsRangeSchema } from "@/shared/schemas/stats";

export const dynamic = "force-dynamic";

/** All Progress figures for ?range=week|month (default week). */
export async function GET(request: Request): Promise<Response> {
  try {
    const profile = await getCurrentProfile(request);
    const param = new URL(request.url).searchParams.get("range") ?? undefined;
    const range = statsRangeSchema.safeParse(param);
    if (!range.success) return errorResponse(400, "invalid_range", "Range must be week or month.");
    return Response.json(await getStats(profile, range.data));
  } catch (e) {
    return toErrorResponse(e);
  }
}
