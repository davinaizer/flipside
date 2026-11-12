import { handleAccount } from "@/server/http/handle";
import { readJson } from "@/server/http/parse";
import { createProfile, listProfiles, toMe } from "@/server/profile";

export const dynamic = "force-dynamic";

// Both need a valid sign-in token and act on its account (AU6); no profile cookie is needed.
export const GET = handleAccount(async ({ account }) =>
  Response.json({ profiles: await listProfiles(account.id) }),
);

export const POST = handleAccount(async ({ request, account }) => {
  const body = await readJson(request);
  return Response.json(toMe(await createProfile(account.id, body)).profile, { status: 201 });
});
