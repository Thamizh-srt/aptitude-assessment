import mongoose, { Schema, type InferSchemaType } from "mongoose";

const optionsSchema = new Schema(
  {
    A: { type: String, required: true },
    B: { type: String, required: true },
    C: { type: String, required: true },
    D: { type: String, required: true },
  },
  { _id: false },
);

const questionSchema = new Schema(
  {
    text: { type: String, required: true, trim: true },
    options: { type: optionsSchema, required: true },
    correctOption: { type: String, required: true, enum: ["A", "B", "C", "D"] },
    category: {
      type: String,
      required: true,
      enum: ["Quantitative", "Logical Reasoning", "Verbal"],
    },
    difficulty: { type: String, required: true, enum: ["Easy", "Medium", "Hard"] },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true, collection: "questions" },
);

questionSchema.index({ isActive: 1 });
questionSchema.index({ category: 1, difficulty: 1 });
questionSchema.index({ text: "text" });

export type QuestionDocument = InferSchemaType<typeof questionSchema>;
export const Question: mongoose.Model<QuestionDocument> =
  (mongoose.models.Question as mongoose.Model<QuestionDocument> | undefined) ??
  mongoose.model<QuestionDocument>("Question", questionSchema);
