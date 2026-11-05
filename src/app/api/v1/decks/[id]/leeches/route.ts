import { getLeeches } from "@/server/decks";
import { handle } from "@/server/http/handle";

export const dynamic = "force-dynamic";

export const GET = handle<{ id: string }>(async ({ profile, params }) =>
  Response.json(await getLeeches(profile.id, params.id)),
);
