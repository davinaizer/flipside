import { z } from "zod";

/** Body of PUT /sessions/{id}. Scopes mirror domain/session-builder; the Library uses all and weak, the Deck page deck and topics. */
export const sessionScopeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("all") }),
  z.object({ kind: z.literal("weak") }),
  z.object({ kind: z.literal("deck"), deckId: z.string().uuid() }),
  /** Topics of one deck; ignoreDue is "practise anyway" (D3). */
  z.object({
    kind: z.literal("topics"),
    deckId: z.string().uuid(),
    topics: z.array(z.string().min(1)).min(1),
    ignoreDue: z.boolean().optional(),
  }),
]);
export const sessionRequestSchema = z.object({
  scope: sessionScopeSchema,
  length: z.union([z.literal(5), z.literal(10), z.literal(20), z.literal("all")]),
});

export type SessionRequest = z.infer<typeof sessionRequestSchema>;
