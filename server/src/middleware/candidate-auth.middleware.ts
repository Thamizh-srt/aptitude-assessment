import { createHash } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { CandidateSession } from "../models/CandidateSession.js";
import { CANDIDATE_SESSION_COOKIE } from "../modules/candidate/candidate-auth.service.js";
import { env } from "../lib/env.js";
import { AppError } from "./error.middleware.js";

declare global {
  namespace Express {
    interface Request {
      candidateId?: string;
    }
  }
}

function unauthorized(res: Response) {
  res.status(401).json({
    error: {
      code: "CANDIDATE_AUTH_REQUIRED",
      message: "Your candidate session is invalid or expired. Verify your email to continue.",
    },
  });
}

export async function requireCandidate(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const token = req.cookies?.[CANDIDATE_SESSION_COOKIE];
  const candidateId = req.params.candidateId;
  if (
    typeof token !== "string" ||
    token.length < 32 ||
    typeof candidateId !== "string"
  ) {
    unauthorized(res);
    return;
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const session = await CandidateSession.findOne({
    tokenHash,
    candidateId,
    expiresAt: { $gt: new Date() },
  }).lean();
  if (!session) {
    unauthorized(res);
    return;
  }

  req.candidateId = String(session.candidateId);
  next();
}

export function requireClientOrigin(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  if (req.get("origin") !== env.CLIENT_ORIGIN) {
    next(new AppError(403, "This request origin is not allowed.", "ORIGIN_NOT_ALLOWED"));
    return;
  }
  next();
}
