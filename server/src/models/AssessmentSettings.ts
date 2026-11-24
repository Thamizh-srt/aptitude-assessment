import mongoose, { Schema, type InferSchemaType } from "mongoose";

const assessmentSettingsSchema = new Schema(
  {
    key: { type: String, required: true, default: "singleton", immutable: true },
    durationMinutes: {
      type: Number,
      required: true,
      min: 1,
      max: 180,
      default: 15,
      validate: {
        validator: Number.isInteger,
        message: "Duration must be a whole number of minutes.",
      },
    },
    passPercentage: { type: Number, required: true, min: 0, max: 100, default: 60 },
    questionBankRevision: { type: Number, required: true, default: 0 },
  },
  { timestamps: true, collection: "assessment_settings" },
);

assessmentSettingsSchema.index({ key: 1 }, { unique: true });

export type AssessmentSettingsDocument =
  InferSchemaType<typeof assessmentSettingsSchema>;
export const AssessmentSettings: mongoose.Model<AssessmentSettingsDocument> =
  (mongoose.models.AssessmentSettings as
    | mongoose.Model<AssessmentSettingsDocument>
    | undefined) ??
  mongoose.model<AssessmentSettingsDocument>(
    "AssessmentSettings",
    assessmentSettingsSchema,
  );
