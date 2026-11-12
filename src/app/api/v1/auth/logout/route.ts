import { clearSignInCookie } from "@/server/http/sign-in-cookie";
import { errorResponse } from "@/server/http/errors";
import { readSignInToken, resolveSignInToken, revokeSignInToken } from "@/server/sign-in";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const token = readSignInToken(request);
  // A replayed cookie whose token is gone or expired is 401, not a silent success (AC27).
  if (!token || !(await resolveSignInToken(token))) {
    return errorResponse(401, "unauthorized", "Please sign in first.");
  }
  await revokeSignInToken(token);
  const res = Response.json({ ok: true });
  res.headers.append("Set-Cookie", clearSignInCookie(request));
  return res;
}
