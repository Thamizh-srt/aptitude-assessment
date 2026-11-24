import { Router } from "express";
import { AppError } from "../../middleware/error.middleware.js";
import {
  requireCandidate,
  requireClientOrigin,
} from "../../middleware/candidate-auth.middleware.js";
import {
  answerUpdateSchema,
  candidateIdSchema,
  submitSchema,
} from "./assessment.validation.js";
import {
  answerController,
  instructionsController,
  resultController,
  startController,
  stateController,
  submitController,
} from "./assessment.controller.js";

export const assessmentRouter = Router();

assessmentRouter.param("candidateId", (req, _res, next, value) => {
  const parsed = candidateIdSchema.safeParse(value);
  if (!parsed.success) {
    next(new AppError(404, "Assessment not found.", "ASSESSMENT_NOT_FOUND"));
    return;
  }
  next();
});

assessmentRouter.get("/:candidateId/instructions", requireCandidate, instructionsController);
assessmentRouter.post(
  "/:candidateId/start",
  requireCandidate,
  requireClientOrigin,
  startController,
);
assessmentRouter.get("/:candidateId/state", requireCandidate, stateController);
assessmentRouter.patch(
  "/:candidateId/answers/:answerId",
  requireCandidate,
  requireClientOrigin,
  (req, _res, next) => {
    const parsed = answerUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      next(parsed.error);
      return;
    }
    req.body = parsed.data;
    next();
  },
  answerController,
);
assessmentRouter.post(
  "/:candidateId/submit",
  requireCandidate,
  requireClientOrigin,
  (req, _res, next) => {
    const parsed = submitSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      next(parsed.error);
      return;
    }
    req.body = parsed.data;
    next();
  },
  submitController,
);
assessmentRouter.get("/:candidateId/result", requireCandidate, resultController);
