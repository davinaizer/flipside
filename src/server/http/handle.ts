import type { Profile } from "@/server/profile";
import { getCurrentProfile } from "@/server/profile";
import { toErrorResponse } from "./errors";

type Ctx<P> = { params: Promise<P> };

/**
 * Wraps a Route Handler body: resolves the current profile, and turns an ApiError into
 * its response. Anything else is rethrown so it surfaces as a 500 (see toErrorResponse).
 */
export function handle<P = Record<string, never>>(
  fn: (c: { request: Request; profile: Profile; params: P }) => Promise<Response>,
) {
  return async (request: Request, ctx?: Ctx<P>): Promise<Response> => {
    try {
      const profile = await getCurrentProfile(request);
      return await fn({ request, profile, params: ctx ? await ctx.params : ({} as P) });
    } catch (e) {
      return toErrorResponse(e);
    }
  };
}

/** Same as `handle` for the two routes that run before a profile is chosen. */
export function handleOpen(fn: (request: Request) => Promise<Response>) {
  return async (request: Request): Promise<Response> => {
    try {
      return await fn(request);
    } catch (e) {
      return toErrorResponse(e);
    }
  };
}
