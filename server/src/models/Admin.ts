import mongoose, { Schema, type InferSchemaType } from "mongoose";

const adminSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, required: true, enum: ["ADMIN"], default: "ADMIN" },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "admins" },
);


export type AdminDocument = InferSchemaType<typeof adminSchema>;
export const Admin: mongoose.Model<AdminDocument> =
  (mongoose.models.Admin as mongoose.Model<AdminDocument> | undefined) ??
  mongoose.model<AdminDocument>("Admin", adminSchema);
