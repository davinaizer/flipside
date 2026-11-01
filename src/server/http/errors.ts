export type ApiErrorBody = {
  error: { code: string; message: string; details: unknown[] };
};

/** Builds the PRD section 11 error response. */
export function errorResponse(
  status: number,
  code: string,
  message: string,
  details: unknown[] = [],
): Response {
  const body: ApiErrorBody = { error: { code, message, details } };
  return Response.json(body, { status });
}

/** Thrown by services; routes turn it into the error format with `toErrorResponse`. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: unknown[] = [],
  ) {
    super(message);
  }
}

/** Maps an ApiError to its response; rethrows anything else so it surfaces as a 500. */
export function toErrorResponse(e: unknown): Response {
  if (e instanceof ApiError) return errorResponse(e.status, e.code, e.message, e.details);
  throw e;
}
