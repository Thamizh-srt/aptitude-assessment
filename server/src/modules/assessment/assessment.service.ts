import mongoose from "mongoose";
import {
  AssessmentAttempt,
  type AssessmentAttemptDocument,
} from "../../models/AssessmentAttempt.js";
import { AssessmentSettings } from "../../models/AssessmentSettings.js";
import { Candidate } from "../../models/Candidate.js";
import { CandidateAnswer } from "../../models/CandidateAnswer.js";
import { Question } from "../../models/Question.js";
import { AppError } from "../../middleware/error.middleware.js";
import type { AnswerUpdate } from "./assessment.validation.js";
import { calculateAssessmentScore } from "./assessment.scoring.js";
import { shuffle } from "./assessment.shuffle.js";

const QUESTION_COUNT = 10;
const MAX_SCORE = 20;

type SnapshotAnswer = {
  _id: string | { toString(): string };
  position: number;
  selectedOption?: string | null;
  isMarkedForReview?: boolean;
  questionSnapshot: {
    questionText: string;
    options: { A: string; B: string; C: string; D: string };
    correctOption: string;
  };
};

function resultSummary(attempt: {
  status: string;
  submittedAt?: Date | null;
  startedAt?: Date | null;
  durationMinutesSnapshot?: number | null;
  timeTakenSeconds?: number | null;
  correctCount?: number | null;
  incorrectCount?: number | null;
  unattemptedCount?: number | null;
  marksDeducted?: number | null;
  netScore?: number | null;
  maxScore?: number | null;
  percentage?: number | null;
  passPercentageSnapshot?: number | null;
  resultStatus?: string | null;
}) {
  if (attempt.status !== "SUBMITTED") {
    throw new AppError(409, "This assessment has not been submitted.", "RESULT_NOT_READY");
  }
  if (
    !attempt.submittedAt ||
    !attempt.startedAt ||
    attempt.durationMinutesSnapshot == null ||
    attempt.correctCount == null ||
    attempt.incorrectCount == null ||
    attempt.unattemptedCount == null ||
    attempt.marksDeducted == null ||
    attempt.netScore == null ||
    attempt.maxScore == null ||
    attempt.percentage == null ||
    attempt.timeTakenSeconds == null ||
    attempt.passPercentageSnapshot == null ||
    (attempt.resultStatus !== "PASS" && attempt.resultStatus !== "FAIL")
  ) {
    throw new AppError(500, "The submitted assessment result is incomplete.", "RESULT_DATA_INVALID");
  }

  return {
    status: "SUBMITTED" as const,
    submittedAt: attempt.submittedAt,
    durationMinutes: attempt.durationMinutesSnapshot,
    timeTakenSeconds: attempt.timeTakenSeconds,
    correctCount: attempt.correctCount,
    incorrectCount: attempt.incorrectCount,
    unattemptedCount: attempt.unattemptedCount,
    marksDeducted: attempt.marksDeducted,
    netScore: attempt.netScore,
    maxScore: attempt.maxScore,
    percentage: attempt.percentage,
    passPercentage: attempt.passPercentageSnapshot,
    resultStatus: attempt.resultStatus,
  };
}

function answerForCandidate(answer: SnapshotAnswer) {
  return {
    id: String(answer._id),
    position: answer.position,
    text: answer.questionSnapshot.questionText,
    options: answer.questionSnapshot.options,
    selectedOption: answer.selectedOption ?? null,
    isMarkedForReview: answer.isMarkedForReview ?? false,
  };
}

async function findAttempt(candidateId: string) {
  const candidateExists = await Candidate.exists({ _id: candidateId });
  if (!candidateExists) {
    throw new AppError(404, "Assessment not found.", "ASSESSMENT_NOT_FOUND");
  }

  try {
    return await AssessmentAttempt.findOneAndUpdate(
      { candidateId },
      { $setOnInsert: { candidateId, status: "NOT_STARTED" } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== 11000) {
      throw error;
    }
    const attempt = await AssessmentAttempt.findOne({ candidateId });
    if (!attempt) throw error;
    return attempt;
  }
}

export async function getInstructions(candidateId: string) {
  const [attempt, settings, activeQuestionCount] = await Promise.all([
    findAttempt(candidateId),
    AssessmentSettings.findOne({ key: "singleton" }).lean(),
    Question.countDocuments({ isActive: true }),
  ]);
  const canResume = attempt.status === "IN_PROGRESS";
  const available = activeQuestionCount === QUESTION_COUNT;

  return {
    status: attempt.status,
    questionCount: QUESTION_COUNT,
    activeQuestionCount,
    available: available || canResume,
    durationMinutes: attempt.durationMinutesSnapshot ?? settings?.durationMinutes ?? 15,
    markingScheme: { correct: 2, incorrect: -1, unanswered: 0 },
    maxScore: MAX_SCORE,
    message:
      available || canResume
        ? null
        : "The assessment is temporarily unavailable because the question bank must contain exactly 10 active questions.",
  };
}

async function getAttemptState(candidateId: string) {
  let attempt = await AssessmentAttempt.findOne({ candidateId }).lean();
  if (!attempt) {
    await findAttempt(candidateId);
    attempt = await AssessmentAttempt.findOne({ candidateId }).lean();
  }
  if (!attempt) {
    throw new AppError(404, "Assessment not found.", "ASSESSMENT_NOT_FOUND");
  }

  let answers = await CandidateAnswer.find({ attemptId: String(attempt._id) })
    .sort({ position: 1 })
    .lean();
  const now = new Date();
  if (
    attempt.status === "IN_PROGRESS" &&
    attempt.deadlineAt &&
    attempt.deadlineAt.getTime() <= now.getTime()
  ) {
    await submitAttempt(candidateId, true);
    attempt = await AssessmentAttempt.findOne({ candidateId }).lean();
    if (!attempt) throw new AppError(404, "Assessment not found.", "ASSESSMENT_NOT_FOUND");
    answers = await CandidateAnswer.find({ attemptId: String(attempt._id) })
      .sort({ position: 1 })
      .lean();
  }

  if (
    attempt.status === "IN_PROGRESS" &&
    (!attempt.deadlineAt || answers.length !== QUESTION_COUNT)
  ) {
    throw new AppError(
      409,
      "The assessment state is incomplete. Please contact the assessment administrator.",
      "ASSESSMENT_STATE_INVALID",
    );
  }

  if (attempt.status === "SUBMITTED") {
    return {
      status: attempt.status,
      serverNow: now.toISOString(),
      result: resultSummary(attempt),
    };
  }

  if (attempt.status !== "IN_PROGRESS" || !attempt.deadlineAt) {
    return {
      status: attempt.status,
      serverNow: now.toISOString(),
      durationMinutes: attempt.durationMinutesSnapshot,
      answers: [],
    };
  }

  return {
    status: attempt.status,
    serverNow: now.toISOString(),
    startedAt: attempt.startedAt,
    deadlineAt: attempt.deadlineAt.toISOString(),
    remainingMs: Math.max(0, attempt.deadlineAt.getTime() - now.getTime()),
    durationMinutes: attempt.durationMinutesSnapshot,
    answers: answers.map(answerForCandidate),
  };
}

export async function getAssessmentState(candidateId: string) {
  await findAttempt(candidateId);
  return getAttemptState(candidateId);
}

export async function startAssessment(candidateId: string) {
  await findAttempt(candidateId);
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const attempt = await AssessmentAttempt.findOne({ candidateId }).session(session);
      if (!attempt || attempt.status !== "NOT_STARTED") return;

      const [questions, settings] = await Promise.all([
        Question.find({ isActive: true }).session(session),
        AssessmentSettings.findOne({ key: "singleton" }).session(session),
      ]);
      if (questions.length !== QUESTION_COUNT) {
        throw new AppError(
          503,
          "The assessment is temporarily unavailable because the question bank must contain exactly 10 active questions.",
          "ASSESSMENT_UNAVAILABLE",
        );
      }
      if (!settings) {
        throw new AppError(503, "Assessment settings are unavailable.", "SETTINGS_UNAVAILABLE");
      }

      const orderedQuestions = shuffle(questions);
      const startedAt = new Date();
      const deadlineAt = new Date(startedAt.getTime() + settings.durationMinutes * 60_000);
      const updated = await AssessmentAttempt.updateOne(
        { _id: attempt._id, status: "NOT_STARTED" },
        {
          $set: {
            status: "IN_PROGRESS",
            shuffledQuestionIds: orderedQuestions.map((question) => question._id),
            startedAt,
            deadlineAt,
            durationMinutesSnapshot: settings.durationMinutes,
          },
        },
        { session },
      );
      if (updated.modifiedCount !== 1) return;

      await CandidateAnswer.insertMany(
        orderedQuestions.map((question, position) => ({
          attemptId: String(attempt._id),
          questionId: question._id,
          position,
          questionSnapshot: {
            questionText: question.text,
            options: question.options,
            correctOption: question.correctOption,
          },
        })),
        { session },
      );
    });
  } finally {
    await session.endSession();
  }

  return getAttemptState(candidateId);
}

export async function updateCandidateAnswer(
  candidateId: string,
  answerId: string,
  update: AnswerUpdate,
) {
  const attempt = await AssessmentAttempt.findOne({ candidateId });
  if (!attempt) {
    throw new AppError(404, "Assessment not found.", "ASSESSMENT_NOT_FOUND");
  }
  if (attempt.status !== "IN_PROGRESS") {
    throw new AppError(409, "This assessment is no longer active.", "ASSESSMENT_NOT_ACTIVE");
  }
  if (attempt.deadlineAt && attempt.deadlineAt.getTime() <= Date.now()) {
    await submitAttempt(candidateId, true);
    throw new AppError(409, "Time has expired. Your assessment was submitted.", "ASSESSMENT_EXPIRED");
  }

  const now = new Date();
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const active = await AssessmentAttempt.updateOne(
        {
          _id: attempt._id,
          status: "IN_PROGRESS",
          deadlineAt: { $gt: now },
        },
        { $set: { updatedAt: now } },
        { session },
      );
      if (active.matchedCount !== 1) {
        throw new AppError(409, "This assessment is no longer active.", "ASSESSMENT_NOT_ACTIVE");
      }

      const data: Record<string, unknown> = {};
      if (update.selectedOption !== undefined) {
        data.selectedOption = update.selectedOption;
        data.answeredAt = update.selectedOption === null ? null : now;
      }
      if (update.isMarkedForReview !== undefined) {
        data.isMarkedForReview = update.isMarkedForReview;
      }
      const saved = await CandidateAnswer.updateOne(
        { _id: answerId, attemptId: String(attempt._id) },
        { $set: data },
        { session },
      );
      if (saved.matchedCount !== 1) {
        throw new AppError(404, "Question not found for this assessment.", "QUESTION_NOT_FOUND");
      }
    });
  } finally {
    await session.endSession();
  }

  return getAttemptState(candidateId);
}

export async function submitAttempt(candidateId: string, automatic = false) {
  const now = new Date();
  const session = await mongoose.startSession();
  let resultAttempt: AssessmentAttemptDocument | null = null;
  try {
    await session.withTransaction(async () => {
      const attempt = await AssessmentAttempt.findOne({ candidateId }).session(session);
      if (!attempt) {
        throw new AppError(404, "Assessment not found.", "ASSESSMENT_NOT_FOUND");
      }
      if (attempt.status === "SUBMITTED") {
        resultAttempt = attempt;
        return;
      }
      if (attempt.status !== "IN_PROGRESS" || !attempt.startedAt || !attempt.deadlineAt) {
        throw new AppError(409, "This assessment has not been started.", "ASSESSMENT_NOT_STARTED");
      }

      const answers = await CandidateAnswer.find({ attemptId: String(attempt._id) })
        .sort({ position: 1 })
        .session(session);
      if (answers.length !== QUESTION_COUNT) {
        throw new AppError(
          409,
          "The assessment responses are incomplete and cannot be submitted safely.",
          "ASSESSMENT_STATE_INVALID",
        );
      }
      if (automatic && attempt.deadlineAt.getTime() > now.getTime()) {
        throw new AppError(409, "The assessment time has not expired.", "ASSESSMENT_NOT_EXPIRED");
      }

      const settings = await AssessmentSettings.findOne({ key: "singleton" }).session(session);
      if (!settings) {
        throw new AppError(503, "Assessment settings are unavailable.", "SETTINGS_UNAVAILABLE");
      }

      const score = calculateAssessmentScore(
        answers.map((answer) => ({
          selectedOption: answer.selectedOption ?? null,
          correctOption: answer.questionSnapshot.correctOption,
        })),
        settings.passPercentage,
      );
      const timeTakenSeconds = Math.min(
        Math.max(0, Math.round((now.getTime() - attempt.startedAt.getTime()) / 1000)),
        (attempt.durationMinutesSnapshot ?? 15) * 60,
      );
      const submitted = await AssessmentAttempt.findOneAndUpdate(
        { _id: attempt._id, status: "IN_PROGRESS" },
        {
          $set: {
            status: "SUBMITTED",
            submittedAt: now,
            passPercentageSnapshot: score.passPercentage,
            correctCount: score.correctCount,
            incorrectCount: score.incorrectCount,
            unattemptedCount: score.unattemptedCount,
            marksDeducted: score.marksDeducted,
            netScore: score.netScore,
            maxScore: score.maxScore,
            percentage: score.percentage,
            timeTakenSeconds,
            resultStatus: score.resultStatus,
          },
        },
        { new: true, session },
      );
      if (!submitted) {
        const current = await AssessmentAttempt.findById(attempt._id).session(session);
        if (current?.status === "SUBMITTED") {
          resultAttempt = current;
          return;
        }
        throw new AppError(409, "This assessment is no longer active.", "ASSESSMENT_NOT_ACTIVE");
      }
      resultAttempt = submitted;
    });
  } finally {
    await session.endSession();
  }

  if (!resultAttempt) {
    throw new AppError(500, "The assessment result could not be saved.", "SUBMISSION_FAILED");
  }
  return resultSummary(resultAttempt);
}

export async function getAssessmentResult(candidateId: string) {
  const attempt = await AssessmentAttempt.findOne({ candidateId }).lean();
  if (!attempt) {
    throw new AppError(404, "Assessment not found.", "ASSESSMENT_NOT_FOUND");
  }

  const result = resultSummary(attempt);
  const answers = await CandidateAnswer.find({ attemptId: String(attempt._id) })
    .sort({ position: 1 })
    .lean();
  return {
    ...result,
    answers: answers.map((answer) => ({
      ...answerForCandidate(answer),
      correctOption: answer.questionSnapshot.correctOption,
      isCorrect: answer.selectedOption === answer.questionSnapshot.correctOption,
    })),
  };
}

let expiredAttemptSweepRunning = false;

export function startExpiredAttemptWorker() {
  const timer = setInterval(async () => {
    if (expiredAttemptSweepRunning) return;
    expiredAttemptSweepRunning = true;
    try {
      const expiredAttempts = await AssessmentAttempt.find({
        status: "IN_PROGRESS",
        deadlineAt: { $lte: new Date() },
      })
        .select({ candidateId: 1 })
        .limit(50)
        .lean();
      for (const attempt of expiredAttempts) {
        try {
          await submitAttempt(attempt.candidateId, true);
        } catch (error) {
          console.error("Could not auto-submit expired assessment", error);
        }
      }
    } catch (error) {
      console.error("Expired assessment sweep failed", error);
    } finally {
      expiredAttemptSweepRunning = false;
    }
  }, 5_000);
  timer.unref();
}

