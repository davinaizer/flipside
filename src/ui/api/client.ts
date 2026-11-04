import { z } from "zod";
import { librarySchema, type Library } from "@/shared/schemas/library";
import { statsSchema, type Stats } from "@/shared/schemas/stats";
import { importResultSchema, type ImportResult } from "@/shared/schemas/import";
import { sessionEndResponseSchema, sessionResponseSchema, sessionSummarySchema, type SessionResponse, type SessionSummary } from "@/shared/schemas/session";
import {
  reviewResponseSchema,
  undoResponseSchema,
  type ReviewRequest,
} from "@/shared/schemas/review";
import { settingsSchema, type Settings } from "@/shared/settings";
import {
  meSchema,
  profileListSchema,
  type Me,
  type UpdateProfileRequest,
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
    // A FormData body needs the browser to set its own multipart Content-Type.
    headers: init?.body instanceof FormData ? init.headers : { "Content-Type": "application/json", ...init?.headers },
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
  login: (password: string) =>
    call("/auth/login", z.object({ ok: z.literal(true) }), {
      method: "POST",
      body: JSON.stringify({ password }),
    }),
  library: (): Promise<Library> => call("/library", librarySchema),
  stats: (range: "week" | "month"): Promise<Stats> => call(`/stats?range=${range}`, statsSchema),
  saveSettings: (settings: Settings): Promise<Settings> =>
    call("/settings", z.object({ settings: settingsSchema }), {
      method: "PUT",
      body: JSON.stringify(settings),
    }).then((r) => r.settings),
  /** Loads a session; an empty PUT body resumes an existing one. */
  session: (id: string): Promise<SessionResponse> =>
    call(`/sessions/${id}`, sessionResponseSchema, { method: "PUT" }),
  grade: (reviewId: string, body: ReviewRequest) =>
    call(`/reviews/${reviewId}`, reviewResponseSchema, { method: "PUT", body: JSON.stringify(body) }),
  undoGrade: (reviewId: string) => call(`/reviews/${reviewId}`, undoResponseSchema, { method: "DELETE" }),
  endSession: (id: string) => call(`/sessions/${id}/end`, sessionEndResponseSchema, { method: "POST" }),
  summary: (id: string): Promise<SessionSummary> => call(`/sessions/${id}/summary`, sessionSummarySchema),
  me: (): Promise<Me> => call("/me", meSchema),
  updateProfile: (body: UpdateProfileRequest): Promise<Me> =>
    call("/me", meSchema, { method: "PATCH", body: JSON.stringify(body) }),
  /** Commit step of the import (PRD section 6, step 4): the file plus deck details, or a deckId to re-import. */
  commitImport: (form: FormData): Promise<ImportResult> =>
    call("/imports", importResultSchema, { method: "POST", body: form }),
};
