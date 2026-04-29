import { AppError } from "./AppError";

export class BadRequestError extends AppError {
  constructor(message = "Bad request") {
    super(message, 400, "BAD_REQUEST");
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(`${resource} not found`, 404, "NOT_FOUND");
  }
}

export class ValidationError extends AppError {
  public readonly details: unknown;

  constructor(message: string, details?: unknown) {
    super(message, 422, "VALIDATION_ERROR");
    this.details = details;
  }
}

export class UpstreamError extends AppError {
  constructor(service: string, cause?: string) {
    super(
      `Upstream service '${service}' failed${cause ? `: ${cause}` : ""}`,
      502,
      "UPSTREAM_ERROR"
    );
  }
}

export class RateLimitError extends AppError {
  constructor() {
    super("Too many requests", 429, "RATE_LIMITED");
  }
}
