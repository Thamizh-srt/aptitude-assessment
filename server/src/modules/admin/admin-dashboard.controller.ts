import type { Request, Response } from "express";
import { getAdminDashboard } from "./admin-dashboard.service.js";

export async function getAdminDashboardController(_req: Request, res: Response) {
  res.json(await getAdminDashboard());
}
