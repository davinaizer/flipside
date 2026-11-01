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
