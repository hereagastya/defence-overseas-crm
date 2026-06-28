export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly details?: Record<string, string[]>;
  public readonly isOperational: boolean;

  constructor(
    errorCode: string,
    statusCode: number,
    message?: string,
    details?: Record<string, string[]>,
  ) {
    super(message ?? errorCode);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}
