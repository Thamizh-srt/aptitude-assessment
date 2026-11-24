import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { Admin } from "../../models/Admin.js";
import { AdminSession } from "../../models/AdminSession.js";
import { AppError } from "../../middleware/error.middleware.js";
import type { AdminLoginInput } from "./admin-auth.validation.js";

export const ADMIN_SESSION_COOKIE = "admin_session";
export const ADMIN_SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

export function hashAdminSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function loginAdmin(input: AdminLoginInput) {
  const admin = await Admin.findOne({ email: input.email }).select(
    "_id name email +passwordHash",
  );
  if (!admin || !(await bcrypt.compare(input.password, admin.passwordHash))) {
    throw new AppError(401, "Email or password is incorrect.", "INVALID_CREDENTIALS");
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_DURATION_MS);
  await AdminSession.create({
    adminId: admin._id,
    tokenHash: hashAdminSessionToken(token),
    expiresAt,
  });
  await Admin.updateOne({ _id: admin._id }, { $set: { lastLoginAt: new Date() } });

  return {
    token,
    expiresAt,
    admin: { id: String(admin._id), name: admin.name, email: admin.email },
  };
}

export async function revokeAdminSession(token: string | undefined) {
  if (!token) return;
  await AdminSession.deleteOne({ tokenHash: hashAdminSessionToken(token) });
}
