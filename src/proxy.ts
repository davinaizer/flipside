import { type NextRequest, NextResponse } from "next/server";
import { checkAccess } from "@/server/http/access";

export function proxy(request: NextRequest) {
  // Read the env directly: getEnv also demands DATABASE_URL, which the gate does not need.
  return checkAccess(request, process.env.ADMIN_PASSWORD ?? "") ?? NextResponse.next();
}

// Everything except Next's static assets runs through the check.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
