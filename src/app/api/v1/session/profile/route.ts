import { ApiError, errorResponse } from "@/server/http/errors";
import { handleAccount } from "@/server/http/handle";
import { PROFILE_COOKIE, profileInAccount } from "@/server/profile";
import { selectProfileRequestSchema } from "@/shared/schemas/profile";

export const dynamic = "force-dynamic";

const ONE_YEAR = 60 * 60 * 24 * 365;

export const POST = handleAccount(async ({ request, account }) => {
  const body = selectProfileRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return errorResponse(
      400,
      "invalid_request",
      "Choose a profile to continue.",
      body.error.issues,
    );
  }
  const profile = await profileInAccount(body.data.profileId, account.id);
  // Another account's profile is "does not exist", like an unknown id (AU6).
  if (!profile) throw new ApiError(404, "profile_not_found", "That profile does not exist.");
  const res = Response.json({ id: profile.id, name: profile.name, avatar: profile.avatar });
  // No Secure flag: the iPad reaches the app over plain HTTP on the home network.
  res.headers.append(
    "Set-Cookie",
    `${PROFILE_COOKIE}=${profile.id}; Path=/; Max-Age=${ONE_YEAR}; HttpOnly; SameSite=Lax`,
  );
  return res;
});
