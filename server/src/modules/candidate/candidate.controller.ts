import type { Request, Response } from "express";
import { env } from "../../lib/env.js";
import {
  CANDIDATE_SESSION_COOKIE,
  CANDIDATE_SESSION_MAX_AGE_MS,
  requestCandidateVerification,
  verifyCandidateEmail,
} from "./candidate-auth.service.js";

export async function requestCandidateVerificationController(
  req: Request,
  res: Response,
) {
  await requestCandidateVerification(req.body);
  res.status(202).json({
    message: "If this email can receive mail, a verification code will be sent.",
  });
}

export async function verifyCandidateEmailController(
  req: Request,
  res: Response,
) {
  const result = await verifyCandidateEmail(req.body);
  res.cookie(CANDIDATE_SESSION_COOKIE, result.sessionToken, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/assessment",
    maxAge: CANDIDATE_SESSION_MAX_AGE_MS,
  });
  res.json({
    message: result.resumed
      ? "Your existing assessment is ready to resume."
      : "Your email is verified and your registration is complete.",
    resumed: result.resumed,
    candidate: result.candidate,
  });
}
