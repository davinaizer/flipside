import { handle } from "@/server/http/handle";
import { readJson } from "@/server/http/parse";
import { readSettings, saveSettings } from "@/server/settings";

export const dynamic = "force-dynamic";

export const GET = handle(async ({ profile }) =>
  Response.json({ settings: readSettings(profile.settings) }),
);

export const PUT = handle(async ({ request, profile }) => {
  const body = await readJson(request);
  return Response.json({ settings: await saveSettings(profile.id, body) });
});
