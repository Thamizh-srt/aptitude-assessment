import type { Request, Response } from "express";
import {
  getAdminAssessmentSettings,
  updateAdminAssessmentSettings,
} from "./admin-settings.service.js";
import { assessmentSettingsInputSchema } from "./admin-settings.validation.js";

export async function getAdminAssessmentSettingsController(
  _req: Request,
  res: Response,
) {
  res.json(await getAdminAssessmentSettings());
}

export async function updateAdminAssessmentSettingsController(
  req: Request,
  res: Response,
) {
  const input = assessmentSettingsInputSchema.parse(req.body);
  res.json(await updateAdminAssessmentSettings(input));
}
