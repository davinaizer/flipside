import { checkPassword, signAuthToken } from "@/server/auth";
import { getEnv } from "@/server/env";
import { errorResponse } from "@/server/http/errors";
import { AUTH_COOKIE_MAX_AGE_SECONDS, AUTH_COOKIE_NAME } from "@/shared/constants";
import { loginRequestSchema } from "@/shared/schemas/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const body = loginRequestSchema.safeParse(await request.json().catch(() => null));
  const { ADMIN_PASSWORD } = getEnv();
  // One neutral answer for a missing and a wrong password: nothing about why (AG1).
  if (!body.success || !checkPassword(body.data.password, ADMIN_PASSWORD)) {
    return errorResponse(401, "invalid_password", "That password did not work. Please try again.");
  }
  const res = Response.json({ ok: true });
  // No Secure flag: the iPad reaches the app over plain HTTP on the home network.
  res.headers.append(
    "Set-Cookie",
    `${AUTH_COOKIE_NAME}=${signAuthToken(ADMIN_PASSWORD)}; Path=/; Max-Age=${AUTH_COOKIE_MAX_AGE_SECONDS}; HttpOnly; SameSite=Lax`,
  );
  return res;
}
