import { getLibrary } from "@/server/decks";
import { handle } from "@/server/http/handle";

export const dynamic = "force-dynamic";

export const GET = handle(async ({ profile }) => Response.json(await getLibrary(profile)));
