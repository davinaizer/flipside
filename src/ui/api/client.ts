import { z } from "zod";
import {
  meSchema,
  profileListSchema,
  type Me,
  type ProfileSummary,
} from "@/shared/schemas/profile";

const API = "/api/v1";

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

/** Calls the API and parses the response with the shared schema; errors carry the server message. */
async function call<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const e = (json as { error?: { code?: string; message?: string } } | null)?.error;
    throw new ApiClientError(
      res.status,
      e?.code ?? "unknown",
      e?.message ?? "Something went wrong.",
    );
  }
  return schema.parse(json);
}

export const api = {
  listProfiles: (): Promise<ProfileSummary[]> =>
    call("/profiles", profileListSchema).then((r) => r.profiles),
  selectProfile: (profileId: string) =>
    call("/session/profile", z.object({ id: z.string() }), {
      method: "POST",
      body: JSON.stringify({ profileId }),
    }),
  me: (): Promise<Me> => call("/me", meSchema),
};
