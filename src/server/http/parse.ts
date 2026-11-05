import type { z } from "zod";
import { ApiError } from "./errors";

type Failure = { status: number; code: string; message?: string };

/**
 * Parses `body` with `schema` or throws an ApiError carrying `{path, message}` details.
 * Without `message` the issue messages are joined into one sentence (the profile endpoints).
 */
export function parseOrThrow<S extends z.ZodType>(
  schema: S,
  body: unknown,
  failure: Failure,
): z.output<S> {
  const parsed = schema.safeParse(body);
  if (parsed.success) return parsed.data;
  const { issues } = parsed.error;
  throw new ApiError(
    failure.status,
    failure.code,
    failure.message ?? issues.map((i) => i.message).join(". "),
    issues.map((i) => ({ path: i.path.join("."), message: i.message })),
  );
}

/**
 * Reads the request body as JSON or throws 400 invalid_json. With `allowEmpty` a blank body
 * gives null (the session resume call).
 */
export async function readJson(
  request: Request,
  options: { allowEmpty?: boolean } = {},
): Promise<unknown> {
  const text = await request.text();
  if (options.allowEmpty && text.trim() === "") return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(400, "invalid_json", "The body must be JSON.");
  }
}
