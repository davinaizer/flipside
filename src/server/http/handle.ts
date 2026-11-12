import type { Account, Profile } from "@/server/profile";
import { getCurrentAccount, getCurrentProfile } from "@/server/profile";
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

/**
 * Same as `handle` for the routes that run before a profile is chosen (the picker's list,
 * Add User and profile selection): resolves the signed-in account instead (AU6).
 */
export function handleAccount(
  fn: (c: { request: Request; account: Account }) => Promise<Response>,
) {
  return async (request: Request): Promise<Response> => {
    try {
      const account = await getCurrentAccount(request);
      return await fn({ request, account });
    } catch (e) {
      return toErrorResponse(e);
    }
  };
}
