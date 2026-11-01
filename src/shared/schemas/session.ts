import { z } from "zod";

/** Body of PUT /sessions/{id}. Scopes mirror domain/session-builder; the library only needs all and weak. */
export const sessionScopeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("all") }),
  z.object({ kind: z.literal("weak") }),
]);
export const sessionRequestSchema = z.object({
  scope: sessionScopeSchema,
  length: z.union([z.literal(5), z.literal(10), z.literal(20), z.literal("all")]),
});

export type SessionRequest = z.infer<typeof sessionRequestSchema>;
