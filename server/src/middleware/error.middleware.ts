import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import mongoose from "mongoose";

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code = "APP_ERROR",
  ) {
    super(message);
  }
}

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`, "NOT_FOUND"));
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "The request contains invalid fields.",
        details: err.flatten(),
      },
    });
    return;
  }

  if (err instanceof mongoose.mongo.MongoServerError) {
    if (err.code === 20 && /transaction numbers are only allowed/i.test(err.message)) {
      res.status(503).json({
        error: {
          code: "MONGODB_REPLICA_SET_REQUIRED",
          message:
            "This operation requires MongoDB transactions. Configure a replica-set deployment such as MongoDB Atlas.",
        },
      });
      return;
    }

    if (err.code === 11000) {
      res.status(409).json({
        error: {
          code: "UNIQUE_CONSTRAINT",
          message: "A record with these values already exists.",
        },
      });
      return;
    }

    res.status(400).json({
      error: {
        code: `MONGO_${err.code}`,
        message: "The database request could not be completed.",
      },
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  if (
    typeof err === "object" &&
    err !== null &&
    "type" in err &&
    err.type === "entity.parse.failed"
  ) {
    res.status(400).json({
      error: {
        code: "INVALID_JSON",
        message: "The request body must be valid JSON.",
      },
    });
    return;
  }

  console.error(err);
  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected server error occurred.",
    },
  });
}
