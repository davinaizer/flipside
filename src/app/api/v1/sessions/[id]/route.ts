import { handle } from "@/server/http/handle";
import { readJson } from "@/server/http/parse";
import { putSession } from "@/server/sessions";

export const dynamic = "force-dynamic";

/** Creates the session from {scope, length}, or with an empty body resumes it. */
export const PUT = handle<{ id: string }>(async ({ request, profile, params }) => {
  const body = await readJson(request, { allowEmpty: true });
  return Response.json(await putSession(profile, params.id, body));
});
