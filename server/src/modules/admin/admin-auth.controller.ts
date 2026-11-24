import type { Request, Response } from "express";
import { env } from "../../lib/env.js";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_DURATION_MS,
  loginAdmin,
  revokeAdminSession,
} from "./admin-auth.service.js";

function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/api/admin",
    maxAge: ADMIN_SESSION_DURATION_MS,
  };
}

export async function adminLoginController(req: Request, res: Response) {
  const session = await loginAdmin(req.body);
  res.cookie(ADMIN_SESSION_COOKIE, session.token, cookieOptions());
  res.json({ admin: session.admin, expiresAt: session.expiresAt });
}

export async function adminLogoutController(req: Request, res: Response) {
  const token = req.cookies?.[ADMIN_SESSION_COOKIE];
  await revokeAdminSession(typeof token === "string" ? token : undefined);
  res.clearCookie(ADMIN_SESSION_COOKIE, {
    ...cookieOptions(),
    maxAge: undefined,
  });
  res.status(204).end();
}

export async function adminSessionController(req: Request, res: Response) {
  res.json({ admin: req.admin });
}
