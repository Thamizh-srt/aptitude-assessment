import type { NextFunction, Request, Response } from "express";
import { Admin } from "../models/Admin.js";
import { AdminSession } from "../models/AdminSession.js";
import {
  ADMIN_SESSION_COOKIE,
  hashAdminSessionToken,
} from "../modules/admin/admin-auth.service.js";

declare global {
  namespace Express {
    interface Request {
      admin?: { id: string; name: string; email: string };
    }
  }
}

function unauthorized(res: Response) {
  res.status(401).json({
    error: {
      code: "ADMIN_AUTH_REQUIRED",
      message: "Please sign in to access the administrator portal.",
    },
  });
}

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const token = req.cookies?.[ADMIN_SESSION_COOKIE];
  if (typeof token !== "string" || token.length < 32) {
    unauthorized(res);
    return;
  }

  const tokenHash = hashAdminSessionToken(token);
  const session = await AdminSession.findOne({
    tokenHash,
    expiresAt: { $gt: new Date() },
  }).lean();
  if (!session) {
    unauthorized(res);
    return;
  }

  const admin = await Admin.findById(session.adminId)
    .select("_id name email role")
    .lean();
  if (!admin || admin.role !== "ADMIN") {
    await AdminSession.deleteOne({ _id: session._id });
    unauthorized(res);
    return;
  }

  req.admin = {
    id: String(admin._id),
    name: admin.name,
    email: admin.email,
  };
  next();
}
