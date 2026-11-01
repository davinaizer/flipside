import { uuidv7 } from "@/shared/uuid";
import type { SessionRequest } from "@/shared/schemas/session";

/**
 * Creates a session with PUT /api/v1/sessions/{id} (the client picks the id, so a retry is
 * idempotent) and returns the id to open at /practice/{id}. Throws when the server refuses.
 */
export async function startSession(request: SessionRequest, fetchFn: typeof fetch = fetch): Promise<string> {
  const id = uuidv7();
  const res = await fetchFn(`/api/v1/sessions/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error("Could not start the session.");
  return id;
}
