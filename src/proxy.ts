import { type NextRequest, NextResponse } from "next/server";
import { checkAccess } from "@/server/http/access";

export function proxy(request: NextRequest) {
  return checkAccess(request) ?? NextResponse.next();
}

// Everything except Next's static assets runs through the check.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
