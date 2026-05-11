/**
 * Single error shape that all of admin-ui works against.
 *
 * Backends each have their own error envelopes. The api client converts them all
 * to ApiError, so UI code only ever needs to render { code, message, details? }.
 */
export class ApiError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: unknown;

  constructor(args: { code: string; message: string; status: number; details?: unknown }) {
    super(args.message);
    this.name = "ApiError";
    this.code = args.code;
    this.status = args.status;
    this.details = args.details;
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}
