import { AUTH_COOKIE_NAME } from "@/shared/constants";

export const dynamic = "force-dynamic";

export async function POST(): Promise<Response> {
  const res = Response.json({ ok: true });
  res.headers.append(
    "Set-Cookie",
    `${AUTH_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`,
  );
  return res;
}
