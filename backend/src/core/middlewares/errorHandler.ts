import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { AppError } from "../errors/AppError";
import { logger } from "../utils/logger";

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };
}

export function errorHandler(
  error: FastifyError | AppError | ZodError | Error,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  const requestId = request.id;

  // Zod validation errors
  if (error instanceof ZodError) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request parameters",
        details: error.flatten().fieldErrors,
        requestId,
      },
    };
    reply.status(422).send(response);
    return;
  }

  // Fastify built-in 404 (route not found)
  if ((error as FastifyError).statusCode === 404) {
    reply.status(404).send({
      success: false,
      error: { code: "NOT_FOUND", message: "Route not found", requestId },
    });
    return;
  }

  // Our operational app errors
  if (error instanceof AppError && error.isOperational) {
    logger.warn({ err: error, requestId }, error.message);
    const response: ErrorResponse = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        requestId,
      },
    };
    reply.status(error.statusCode).send(response);
    return;
  }

  // Unexpected / programming errors — log full stack, hide internals from client
  logger.error({ err: error, requestId }, "Unhandled server error");
  reply.status(500).send({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred. Please try again later.",
      requestId,
    },
  });
}
