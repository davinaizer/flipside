import { errorResponse } from "@/server/http/errors";
import { signInCookie } from "@/server/http/sign-in-cookie";
import { signIn } from "@/server/sign-in";
import { loginRequestSchema } from "@/shared/schemas/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const body = loginRequestSchema.safeParse(await request.json().catch(() => null));
  // One neutral answer for every failure: malformed input, unknown email, wrong password
  // and rate limit. signIn runs a password check even for a bad email, so timing is the same too (AU1).
  const result = body.success ? await signIn(body.data.email, body.data.password) : null;
  if (!result) {
    return errorResponse(
      401,
      "invalid_credentials",
      "That email and password did not work. Please try again.",
    );
  }
  const res = Response.json({ ok: true });
  res.headers.append("Set-Cookie", signInCookie(request, result.token));
  return res;
}
