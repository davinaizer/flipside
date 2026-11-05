import { handle } from "@/server/http/handle";
import { getSummary } from "@/server/sessions";

export const dynamic = "force-dynamic";

/** Counts by grade, session time, cards to go again and the ids to practise as misses. */
export const GET = handle<{ id: string }>(async ({ profile, params }) =>
  Response.json(await getSummary(profile, params.id)),
);
