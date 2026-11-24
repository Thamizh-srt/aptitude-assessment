import { Router } from "express";
import { adminLoginRateLimit } from "../../middleware/admin-login-rate-limit.middleware.js";
import { requireAdmin } from "../../middleware/admin-auth.middleware.js";
import { adminLoginSchema } from "./admin-auth.validation.js";
import {
  adminLoginController,
  adminLogoutController,
  adminSessionController,
} from "./admin-auth.controller.js";
import { getAdminDashboardController } from "./admin-dashboard.controller.js";
import {
  createAdminQuestionController,
  deleteAdminQuestionController,
  listAdminQuestionsController,
  updateAdminQuestionController,
} from "./admin-question.controller.js";
import {
  exportAdminCandidatesController,
  getAdminCandidateController,
  listAdminCandidatesController,
} from "./admin-candidate.controller.js";
import {
  getAdminAssessmentSettingsController,
  updateAdminAssessmentSettingsController,
} from "./admin-settings.controller.js";

export const adminRouter = Router();

adminRouter.post("/auth/login", adminLoginRateLimit, (req, _res, next) => {
  const parsed = adminLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    next(parsed.error);
    return;
  }
  req.body = parsed.data;
  next();
}, adminLoginController);
adminRouter.post("/auth/logout", adminLogoutController);
adminRouter.get("/auth/session", requireAdmin, adminSessionController);

adminRouter.use(requireAdmin);
adminRouter.get("/dashboard", getAdminDashboardController);
adminRouter.get("/settings", getAdminAssessmentSettingsController);
adminRouter.patch("/settings", updateAdminAssessmentSettingsController);
adminRouter.get("/questions", listAdminQuestionsController);
adminRouter.post("/questions", createAdminQuestionController);
adminRouter.patch("/questions/:questionId", updateAdminQuestionController);
adminRouter.delete("/questions/:questionId", deleteAdminQuestionController);
adminRouter.get("/candidates", listAdminCandidatesController);
adminRouter.get("/candidates/export.csv", exportAdminCandidatesController);
adminRouter.get("/candidates/:candidateId", getAdminCandidateController);
