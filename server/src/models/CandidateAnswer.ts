import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { createPublicId } from "../lib/public-id.js";

const questionOptionsSchema = new Schema(
  {
    A: { type: String, required: true },
    B: { type: String, required: true },
    C: { type: String, required: true },
    D: { type: String, required: true },
  },
  { _id: false },
);

const questionSnapshotSchema = new Schema(
  {
    questionText: { type: String, required: true },
    options: { type: questionOptionsSchema, required: true },
    correctOption: { type: String, required: true, enum: ["A", "B", "C", "D"] },
  },
  { _id: false },
);

const candidateAnswerSchema = new Schema(
  {
    _id: { type: String, default: createPublicId },
    attemptId: {
      type: String,
      required: true,
      ref: "AssessmentAttempt",
    },
    questionId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Question",
    },
    position: { type: Number, required: true, min: 0 },
    selectedOption: {
      type: String,
      enum: ["A", "B", "C", "D"],
      default: null,
    },
    isMarkedForReview: { type: Boolean, required: true, default: false },
    answeredAt: { type: Date, default: null },
    questionSnapshot: { type: questionSnapshotSchema, required: true },
  },
  { timestamps: true, collection: "candidate_answers" },
);

candidateAnswerSchema.index({ attemptId: 1, questionId: 1 }, { unique: true });
candidateAnswerSchema.index({ attemptId: 1, position: 1 }, { unique: true });
candidateAnswerSchema.index({ questionId: 1 });

export type CandidateAnswerDocument =
  InferSchemaType<typeof candidateAnswerSchema>;
export const CandidateAnswer: mongoose.Model<CandidateAnswerDocument> =
  (mongoose.models.CandidateAnswer as
    | mongoose.Model<CandidateAnswerDocument>
    | undefined) ??
  mongoose.model<CandidateAnswerDocument>("CandidateAnswer", candidateAnswerSchema);
