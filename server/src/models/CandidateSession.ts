import mongoose, { Schema, type InferSchemaType } from "mongoose";

const candidateSessionSchema = new Schema(
  {
    candidateId: {
      type: String,
      required: true,
      ref: "Candidate",
      index: true,
    },
    tokenHash: { type: String, required: true, unique: true, select: false },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true, collection: "candidate_sessions" },
);

candidateSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type CandidateSessionDocument = InferSchemaType<
  typeof candidateSessionSchema
>;
export const CandidateSession: mongoose.Model<CandidateSessionDocument> =
  (mongoose.models.CandidateSession as
    | mongoose.Model<CandidateSessionDocument>
    | undefined) ??
  mongoose.model<CandidateSessionDocument>(
    "CandidateSession",
    candidateSessionSchema,
  );
