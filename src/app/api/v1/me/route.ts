import { toErrorResponse } from "@/server/http/errors";
import { getCurrentProfile, toMe } from "@/server/profile";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  try {
    return Response.json(toMe(await getCurrentProfile(request)));
  } catch (e) {
    return toErrorResponse(e);
  }
}
