import { toErrorResponse } from "@/server/http/errors";
import { readJson } from "@/server/http/parse";
import { getCurrentProfile } from "@/server/profile";
import { putSession } from "@/server/sessions";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Creates the session from {scope, length}, or with an empty body resumes it. */
export async function PUT(request: Request, { params }: Ctx): Promise<Response> {
  try {
    const profile = await getCurrentProfile(request);
    const body = await readJson(request, { allowEmpty: true });
    return Response.json(await putSession(profile, (await params).id, body));
  } catch (e) {
    return toErrorResponse(e);
  }
}
