import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { createPublicId } from "../lib/public-id.js";

const candidateSchema = new Schema(
  {
    _id: { type: String, default: createPublicId },
    fullName: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    age: { type: Number, required: true, min: 18, max: 60 },
    phone: { type: String, required: true, match: /^\d{10}$/ },
    gender: { type: String, enum: ["Male", "Female", "Non-binary", "Prefer not to say"], default: null },
    qualification: { type: String, required: true, trim: true },
    city: { type: String, trim: true, default: null },
  },
  { timestamps: true, collection: "candidates" },
);

candidateSchema.index({ fullName: 1 });
candidateSchema.index({ createdAt: -1 });

export type CandidateDocument = InferSchemaType<typeof candidateSchema>;
export const Candidate: mongoose.Model<CandidateDocument> =
  (mongoose.models.Candidate as mongoose.Model<CandidateDocument> | undefined) ??
  mongoose.model<CandidateDocument>("Candidate", candidateSchema);
