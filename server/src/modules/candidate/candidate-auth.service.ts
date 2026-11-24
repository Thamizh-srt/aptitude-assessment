import {
  createHash,
  randomBytes,
  randomInt,
} from "node:crypto";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { AssessmentAttempt } from "../../models/AssessmentAttempt.js";
import { Candidate } from "../../models/Candidate.js";
import { CandidateSession } from "../../models/CandidateSession.js";
import { CandidateVerification } from "../../models/CandidateVerification.js";
import { Question } from "../../models/Question.js";
import { AppError } from "../../middleware/error.middleware.js";
import type { CandidateRegistrationInput } from "./candidate.validation.js";
import type { CandidateEmailVerificationInput } from "./candidate-email.validation.js";
import {
  getCandidateEmailConfig,
  sendCandidateVerificationEmail,
} from "./candidate-email.service.js";

export const CANDIDATE_SESSION_COOKIE = "candidate_session";
export const CANDIDATE_SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const VERIFICATION_LIFETIME_MS = 15 * 60 * 1000;
const VERIFICATION_RESEND_DELAY_MS = 60 * 1000;
const MAX_VERIFICATION_ATTEMPTS = 5;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function invalidVerification() {
  return new AppError(
    400,
    "This verification code is invalid or has expired. Request a new code and try again.",
    "VERIFICATION_INVALID",
  );
}

function tooManyVerificationRequests() {
  return new AppError(
    429,
    "Please wait a minute before requesting another verification code.",
    "VERIFICATION_RATE_LIMITED",
  );
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

async function findOrCreateAttempt(candidateId: string) {
  try {
    return await AssessmentAttempt.findOneAndUpdate(
      { candidateId },
      { $setOnInsert: { candidateId, status: "NOT_STARTED" } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    const attempt = await AssessmentAttempt.findOne({ candidateId });
    if (!attempt) throw error;
    return attempt;
  }
}

export async function requestCandidateVerification(
  input: CandidateRegistrationInput,
) {
  getCandidateEmailConfig();

  const [candidate, pending] = await Promise.all([
    Candidate.findOne({ email: input.email }).select("_id").lean(),
    CandidateVerification.findOne({ email: input.email })
      .select("_id resendAfter")
      .lean(),
  ]);
  const now = new Date();
  if (pending && pending.resendAfter.getTime() > now.getTime()) {
    throw tooManyVerificationRequests();
  }

  const code = randomInt(0, 100_000_000).toString().padStart(8, "0");
  const tokenHash = await bcrypt.hash(code, 12);
  const filter = pending
    ? { _id: pending._id, resendAfter: { $lte: now } }
    : { email: input.email };
  let verification;
  try {
    verification = await CandidateVerification.findOneAndUpdate(
      filter,
      {
        $set: {
          email: input.email,
          candidateId: candidate ? String(candidate._id) : null,
          registrationData: candidate
            ? null
            : {
                fullName: input.fullName,
                age: input.age,
                phone: input.phone,
                gender: input.gender || null,
                qualification: input.qualification,
                city: input.city || null,
              },
          verificationTokenHash: tokenHash,
          verificationAttempts: 0,
          expiresAt: new Date(now.getTime() + VERIFICATION_LIFETIME_MS),
          resendAfter: new Date(now.getTime() + VERIFICATION_RESEND_DELAY_MS),
          consumedAt: null,
        },
      },
      {
        upsert: !pending,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );
  } catch (error) {
    if (isDuplicateKeyError(error)) throw tooManyVerificationRequests();
    throw error;
  }
  if (!verification) throw tooManyVerificationRequests();

  try {
    await sendCandidateVerificationEmail(input.email, code);
  } catch (error) {
    await CandidateVerification.deleteOne({
      _id: verification._id,
      verificationTokenHash: tokenHash,
    });
    throw error;
  }
}

export async function verifyCandidateEmail(
  input: CandidateEmailVerificationInput,
) {
  const now = new Date();
  const candidateVerification = await CandidateVerification.findOne({
    email: input.email,
    expiresAt: { $gt: now },
    consumedAt: null,
  })
    .select("+verificationTokenHash")
    .lean();

  if (!candidateVerification) throw invalidVerification();
  const codeMatches = await bcrypt.compare(
    input.code,
    candidateVerification.verificationTokenHash,
  );
  if (
    candidateVerification.verificationAttempts >= MAX_VERIFICATION_ATTEMPTS ||
    !codeMatches
  ) {
    if (candidateVerification.verificationAttempts < MAX_VERIFICATION_ATTEMPTS) {
      const attemptsAfterFailure = candidateVerification.verificationAttempts + 1;
      await CandidateVerification.findOneAndUpdate(
        {
          _id: candidateVerification._id,
          verificationTokenHash: candidateVerification.verificationTokenHash,
          verificationAttempts: candidateVerification.verificationAttempts,
          consumedAt: null,
        },
        {
          $inc: { verificationAttempts: 1 },
          ...(attemptsAfterFailure >= MAX_VERIFICATION_ATTEMPTS
            ? { $set: { consumedAt: now } }
            : {}),
        },
      );
    }
    throw invalidVerification();
  }

  if (!candidateVerification.candidateId) {
    const activeQuestionCount = await Question.countDocuments({ isActive: true });
    if (activeQuestionCount !== 10) {
      throw new AppError(
        503,
        "The assessment is temporarily unavailable because exactly 10 active questions are required. Please try again later.",
        "ASSESSMENT_UNAVAILABLE",
      );
    }
  }

  const claimed = await CandidateVerification.findOneAndUpdate(
    {
      _id: candidateVerification._id,
      verificationTokenHash: candidateVerification.verificationTokenHash,
      verificationAttempts: { $lt: MAX_VERIFICATION_ATTEMPTS },
      expiresAt: { $gt: now },
      consumedAt: null,
    },
    { $set: { consumedAt: now } },
    { new: true },
  ).lean();
  if (!claimed) throw invalidVerification();

  try {
    let candidateId = "";
    let resumed = Boolean(claimed.candidateId);

    if (claimed.candidateId) {
      const candidate = await Candidate.findById(claimed.candidateId)
        .select("_id fullName email createdAt")
        .lean();
      if (!candidate) throw invalidVerification();

      const attempt = await findOrCreateAttempt(String(candidate._id));
      if (attempt.status === "SUBMITTED") {
        throw new AppError(
          409,
          "This email has already completed the assessment.",
          "ASSESSMENT_ALREADY_COMPLETED",
        );
      }
      candidateId = String(candidate._id);
      resumed = true;
    } else {
      const registrationData = claimed.registrationData;
      if (!registrationData) throw invalidVerification();

      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          const activeQuestionCount = await Question.countDocuments({
            isActive: true,
          }).session(session);
          if (activeQuestionCount !== 10) {
            throw new AppError(
              503,
              "The assessment is temporarily unavailable because exactly 10 active questions are required. Please try again later.",
              "ASSESSMENT_UNAVAILABLE",
            );
          }

          const [createdCandidate] = await Candidate.create(
            [
              {
                ...registrationData,
                email: claimed.email,
              },
            ],
            { session },
          );
          if (!createdCandidate) {
            throw new AppError(
              500,
              "Registration could not be completed.",
              "REGISTRATION_FAILED",
            );
          }
          candidateId = createdCandidate.id;
          await AssessmentAttempt.create(
            [{ candidateId, status: "NOT_STARTED" }],
            { session },
          );
        });
      } finally {
        await session.endSession();
      }
      if (!candidateId) {
        throw new AppError(
          500,
          "Registration could not be completed.",
          "REGISTRATION_FAILED",
        );
      }
    }

    const candidate = await Candidate.findById(candidateId)
      .select("_id fullName email createdAt")
      .lean();
    if (!candidate) throw invalidVerification();

    const sessionToken = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + CANDIDATE_SESSION_MAX_AGE_MS);
    await CandidateSession.create({
      candidateId,
      tokenHash: hashToken(sessionToken),
      expiresAt,
    });
    await CandidateVerification.deleteOne({ _id: claimed._id });

    return {
      candidate: {
        id: String(candidate._id),
        fullName: candidate.fullName,
        email: candidate.email,
        createdAt: candidate.createdAt,
      },
      resumed,
      sessionToken,
      sessionExpiresAt: expiresAt,
    };
  } catch (error) {
    await CandidateVerification.deleteOne({ _id: claimed._id });
    throw error;
  }
}
