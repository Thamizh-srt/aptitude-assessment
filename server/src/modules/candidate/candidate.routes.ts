import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { candidateRegistrationSchema } from "./candidate.validation.js";
import { candidateEmailVerificationSchema } from "./candidate-email.validation.js";
import {
  requestCandidateVerificationController,
  verifyCandidateEmailController,
} from "./candidate.controller.js";
import { rateLimit } from "express-rate-limit";
import { requireClientOrigin } from "../../middleware/candidate-auth.middleware.js";

export const candidateRouter = Router();

const verificationRequestRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: {
      code: "VERIFICATION_RATE_LIMITED",
      message: "Too many verification requests. Please try again later.",
    },
  },
});

function validate(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(result.error);
      return;
    }

    req.body = result.data;
    next();
  };
}

candidateRouter.post(
  "/register",
  verificationRequestRateLimit,
  requireClientOrigin,
  validate(candidateRegistrationSchema),
  requestCandidateVerificationController,
);
candidateRouter.post(
  "/verify-email",
  verificationRequestRateLimit,
  requireClientOrigin,
  validate(candidateEmailVerificationSchema),
  verifyCandidateEmailController,
);
