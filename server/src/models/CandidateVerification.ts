import mongoose, { Schema, type InferSchemaType } from "mongoose";

const registrationDataSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
    age: { type: Number, required: true, min: 18, max: 60 },
    phone: { type: String, required: true, match: /^\d{10}$/ },
    gender: { type: String, default: null },
    qualification: { type: String, required: true, trim: true, maxlength: 100 },
    city: { type: String, trim: true, default: null, maxlength: 100 },
  },
  { _id: false },
);

const candidateVerificationSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    candidateId: { type: String, ref: "Candidate", default: null },
    registrationData: { type: registrationDataSchema, default: null },
    verificationTokenHash: { type: String, required: true, select: false },
    verificationAttempts: { type: Number, required: true, default: 0 },
    expiresAt: { type: Date, required: true },
    resendAfter: { type: Date, required: true },
    consumedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "candidate_verifications" },
);

candidateVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type CandidateVerificationDocument =
  InferSchemaType<typeof candidateVerificationSchema>;
export const CandidateVerification: mongoose.Model<CandidateVerificationDocument> =
  (mongoose.models.CandidateVerification as
    | mongoose.Model<CandidateVerificationDocument>
    | undefined) ??
  mongoose.model<CandidateVerificationDocument>(
    "CandidateVerification",
    candidateVerificationSchema,
  );
