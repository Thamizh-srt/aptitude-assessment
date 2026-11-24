import { z } from "zod";

export const candidateIdSchema = z.string().regex(/^[a-z0-9]{20,32}$/);

export const answerUpdateSchema = z
  .object({
    selectedOption: z.enum(["A", "B", "C", "D"]).nullable().optional(),
    isMarkedForReview: z.boolean().optional(),
  })
  .refine(
    (value) => value.selectedOption !== undefined || value.isMarkedForReview !== undefined,
    "Update an answer or its review status.",
  );

export const submitSchema = z.object({
  automatic: z.boolean().optional().default(false),
});

export type AnswerUpdate = z.infer<typeof answerUpdateSchema>;
