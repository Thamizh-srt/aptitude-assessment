import mongoose, { Schema, type InferSchemaType } from "mongoose";

const adminSessionSchema = new Schema(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Admin",
      index: true,
    },
    tokenHash: { type: String, required: true, unique: true, select: false },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true, collection: "admin_sessions" },
);

adminSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type AdminSessionDocument = InferSchemaType<typeof adminSessionSchema>;
export const AdminSession: mongoose.Model<AdminSessionDocument> =
  (mongoose.models.AdminSession as
    | mongoose.Model<AdminSessionDocument>
    | undefined) ??
  mongoose.model<AdminSessionDocument>("AdminSession", adminSessionSchema);
