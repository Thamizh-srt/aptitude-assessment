import { z } from "zod";

export const candidateEmailVerificationSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  code: z.string().regex(/^\d{8}$/),
}).strict();

export type CandidateEmailVerificationInput = z.infer<
  typeof candidateEmailVerificationSchema
>;
