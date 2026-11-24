import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { createPublicId } from "../lib/public-id.js";

const assessmentAttemptSchema = new Schema(
  {
    _id: { type: String, default: createPublicId },
    candidateId: {
      type: String,
      required: true,
      unique: true,
      ref: "Candidate",
    },
    status: {
      type: String,
      required: true,
      enum: ["NOT_STARTED", "IN_PROGRESS", "SUBMITTED"],
      default: "NOT_STARTED",
    },
    shuffledQuestionIds: [{ type: Schema.Types.ObjectId, ref: "Question" }],
    startedAt: { type: Date, default: null },
    deadlineAt: { type: Date, default: null },
    submittedAt: { type: Date, default: null },
    durationMinutesSnapshot: { type: Number, default: null },
    passPercentageSnapshot: { type: Number, default: null, min: 0, max: 100 },
    correctCount: { type: Number, default: null },
    incorrectCount: { type: Number, default: null },
    unattemptedCount: { type: Number, default: null },
    marksDeducted: { type: Number, default: null },
    netScore: { type: Number, default: null },
    maxScore: { type: Number, default: null },
    percentage: { type: Number, default: null },
    timeTakenSeconds: { type: Number, default: null },
    resultStatus: { type: String, enum: ["PASS", "FAIL"], default: null },
  },
  { timestamps: true, collection: "assessment_attempts" },
);

assessmentAttemptSchema.index({ status: 1 });
assessmentAttemptSchema.index({ deadlineAt: 1 });
assessmentAttemptSchema.index({ submittedAt: -1 });
assessmentAttemptSchema.index({ netScore: -1 });
assessmentAttemptSchema.index({ resultStatus: 1 });
assessmentAttemptSchema.index({ candidateId: 1, status: 1 });

export type AssessmentAttemptDocument =
  InferSchemaType<typeof assessmentAttemptSchema>;
export const AssessmentAttempt: mongoose.Model<AssessmentAttemptDocument> =
  (mongoose.models.AssessmentAttempt as
    | mongoose.Model<AssessmentAttemptDocument>
    | undefined) ??
  mongoose.model<AssessmentAttemptDocument>(
    "AssessmentAttempt",
    assessmentAttemptSchema,
  );
