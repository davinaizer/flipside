import { handle } from "@/server/http/handle";
import { endSession } from "@/server/sessions";

export const dynamic = "force-dynamic";

/** Ends the session early; grades already given are kept. */
export const POST = handle<{ id: string }>(async ({ profile, params }) =>
  Response.json(await endSession(profile, params.id)),
);
