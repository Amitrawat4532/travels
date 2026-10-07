/** Domain error whose message is safe to show to the user. */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string = "APP_ERROR",
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function isAppError(e: unknown): e is AppError {
  return e instanceof AppError;
}
