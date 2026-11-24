import type { PipelineStage } from "mongoose";
import { AssessmentAttempt } from "../../models/AssessmentAttempt.js";
import { Candidate } from "../../models/Candidate.js";
import { CandidateAnswer } from "../../models/CandidateAnswer.js";
import { AppError } from "../../middleware/error.middleware.js";
import type {
  CandidateExportQuery,
  CandidateListQuery,
} from "./admin-candidate.validation.js";

const CANDIDATES_PER_PAGE = 10;

type CandidateListRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  age: number;
  score: number | null;
  maxScore: number | null;
  percentage: number | null;
  resultStatus: "PASS" | "FAIL" | null;
  attemptStatus: "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED";
  attemptDate: Date | null;
};

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function candidateFilterStages(
  query: CandidateListQuery | CandidateExportQuery,
  completedOnly: boolean,
): PipelineStage[] {
  const stages: PipelineStage[] = [
    {
      $lookup: {
        from: "assessment_attempts",
        localField: "_id",
        foreignField: "candidateId",
        as: "attempt",
      },
    },
    { $unwind: { path: "$attempt", preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        score: { $ifNull: ["$attempt.netScore", null] },
        maxScore: { $ifNull: ["$attempt.maxScore", null] },
        percentage: { $ifNull: ["$attempt.percentage", null] },
        resultStatus: {
          $cond: [
            { $eq: ["$attempt.status", "SUBMITTED"] },
            { $ifNull: ["$attempt.resultStatus", null] },
            null,
          ],
        },
        attemptStatus: { $ifNull: ["$attempt.status", "NOT_STARTED"] },
        attemptDate: { $ifNull: ["$attempt.submittedAt", "$attempt.startedAt"] },
        sortDate: {
          $ifNull: [
            "$attempt.submittedAt",
            { $ifNull: ["$attempt.startedAt", "$createdAt"] },
          ],
        },
      },
    },
  ];

  if (query.search) {
    const search = new RegExp(escapeRegex(query.search), "i");
    stages.push({
      $match: { $or: [{ fullName: search }, { email: search }] },
    });
  }
  if (query.resultStatus !== "ALL") {
    stages.push({ $match: { resultStatus: query.resultStatus } });
  }
  if (completedOnly) {
    stages.push({ $match: { attemptStatus: "SUBMITTED" } });
  }
  return stages;
}

function candidateProjection(): PipelineStage {
  return {
    $project: {
      _id: 0,
      id: { $toString: "$_id" },
      fullName: 1,
      email: 1,
      phone: 1,
      age: 1,
      score: 1,
      maxScore: 1,
      percentage: 1,
      resultStatus: 1,
      attemptStatus: 1,
      attemptDate: 1,
    },
  };
}

function sortStage(sortBy: "date" | "score", sortOrder: "asc" | "desc"): PipelineStage {
  const direction = sortOrder === "asc" ? 1 : -1;
  return {
    $sort: {
      [sortBy === "score" ? "score" : "sortDate"]: direction,
      _id: 1,
    },
  };
}

export async function listAdminCandidates(query: CandidateListQuery) {
  const stages = candidateFilterStages(query, false);
  const [candidates, countRows] = await Promise.all([
    Candidate.aggregate<CandidateListRow>([
      ...stages,
      sortStage(query.sortBy, query.sortOrder),
      { $skip: (query.page - 1) * CANDIDATES_PER_PAGE },
      { $limit: CANDIDATES_PER_PAGE },
      candidateProjection(),
    ]),
    Candidate.aggregate<{ total: number }>([
      ...stages,
      { $count: "total" },
    ]),
  ]);
  const total = countRows[0]?.total ?? 0;
  return {
    candidates,
    pagination: {
      page: query.page,
      pageSize: CANDIDATES_PER_PAGE,
      total,
      totalPages: Math.ceil(total / CANDIDATES_PER_PAGE),
    },
  };
}

export async function getAdminCandidate(candidateId: string) {
  if (!/^[a-z0-9]{20,32}$/i.test(candidateId)) {
    throw new AppError(404, "Candidate not found.", "CANDIDATE_NOT_FOUND");
  }
  const candidate = await Candidate.findById(candidateId).lean();
  if (!candidate) {
    throw new AppError(404, "Candidate not found.", "CANDIDATE_NOT_FOUND");
  }
  const attempt = await AssessmentAttempt.findOne({ candidateId }).lean();
  const answers = attempt
    ? await CandidateAnswer.find({ attemptId: String(attempt._id) })
        .sort({ position: 1 })
        .lean()
    : [];

  return {
    candidate: {
      id: String(candidate._id),
      fullName: candidate.fullName,
      email: candidate.email,
      phone: candidate.phone,
      age: candidate.age,
      gender: candidate.gender,
      qualification: candidate.qualification,
      city: candidate.city,
      registeredAt: candidate.createdAt,
    },
    attempt: attempt
      ? {
          status: attempt.status,
          startedAt: attempt.startedAt,
          submittedAt: attempt.submittedAt,
          durationMinutes: attempt.durationMinutesSnapshot,
          timeTakenSeconds: attempt.timeTakenSeconds,
          score: attempt.netScore,
          maxScore: attempt.maxScore,
          percentage: attempt.percentage,
          correctCount: attempt.correctCount,
          incorrectCount: attempt.incorrectCount,
          unattemptedCount: attempt.unattemptedCount,
          marksDeducted: attempt.marksDeducted,
          passPercentage: attempt.passPercentageSnapshot,
          resultStatus: attempt.resultStatus,
        }
      : null,
    answers: answers.map((answer) => ({
      id: String(answer._id),
      position: answer.position,
      text: answer.questionSnapshot.questionText,
      options: answer.questionSnapshot.options,
      selectedOption: answer.selectedOption,
      correctOption: answer.questionSnapshot.correctOption,
      isCorrect:
        answer.selectedOption !== null &&
        answer.selectedOption === answer.questionSnapshot.correctOption,
      isMarkedForReview: answer.isMarkedForReview,
    })),
  };
}

function csvCell(value: string | number | Date | null, protectFormula = false) {
  let text = value instanceof Date ? value.toISOString() : String(value ?? "");
  if (protectFormula && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export async function exportAdminCandidates(query: CandidateExportQuery) {
  const rows = await Candidate.aggregate<CandidateListRow>([
    ...candidateFilterStages(query, true),
    sortStage(query.sortBy, query.sortOrder),
    candidateProjection(),
  ]);
  const headers = [
    "Name",
    "Email",
    "Phone",
    "Age",
    "Score",
    "Max Score",
    "Percentage",
    "Pass/Fail",
    "Attempt Date",
  ];
  const lines = rows.map((row) =>
    [
      csvCell(row.fullName, true),
      csvCell(row.email, true),
      csvCell(row.phone, true),
      csvCell(row.age),
      csvCell(row.score),
      csvCell(row.maxScore),
      csvCell(row.percentage),
      csvCell(row.resultStatus, true),
      csvCell(row.attemptDate),
    ].join(","),
  );
  return `\uFEFF${headers.map((header) => csvCell(header)).join(",")}\r\n${lines.join("\r\n")}`;
}
