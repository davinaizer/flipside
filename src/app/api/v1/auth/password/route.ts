import { changePassword } from "@/server/accounts";
import { ApiError } from "@/server/http/errors";
import { handleAccount } from "@/server/http/handle";
import { readSignInToken } from "@/server/sign-in";
import { changePasswordRequestSchema } from "@/shared/schemas/auth";

export const dynamic = "force-dynamic";

export const POST = handleAccount(async ({ request, account }) => {
  const body = changePasswordRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success)
    throw new ApiError(400, "invalid_request", "Enter your current and new password.");
  // handleAccount resolved this token, so it is present.
  await changePassword(account.id, readSignInToken(request)!, body.data);
  return Response.json({ ok: true });
});
