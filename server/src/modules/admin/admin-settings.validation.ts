import { z } from "zod";

export const assessmentSettingsInputSchema = z.object({
  durationMinutes: z.number().int().min(1).max(180),
  passPercentage: z.number().min(0).max(100),
}).strict();

export type AssessmentSettingsInput = z.infer<
  typeof assessmentSettingsInputSchema
>;
