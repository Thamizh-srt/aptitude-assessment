import { z } from "zod";

const optionSchema = z.string().trim().min(1, "Each option is required.").max(500);

export const questionInputSchema = z.object({
  text: z.string().trim().min(10).max(1000),
  options: z.object({
    A: optionSchema,
    B: optionSchema,
    C: optionSchema,
    D: optionSchema,
  }).strict(),
  correctOption: z.enum(["A", "B", "C", "D"]),
  category: z.enum(["Quantitative", "Logical Reasoning", "Verbal"]),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  isActive: z.boolean(),
}).strict();

export const questionListQuerySchema = z.object({
  category: z.enum(["Quantitative", "Logical Reasoning", "Verbal"]).optional(),
  difficulty: z.enum(["Easy", "Medium", "Hard"]).optional(),
  status: z.enum(["ALL", "ACTIVE", "INACTIVE"]).default("ALL"),
  page: z.coerce.number().int().min(1).default(1),
}).strict();

export type QuestionInput = z.infer<typeof questionInputSchema>;
export type QuestionListQuery = z.infer<typeof questionListQuerySchema>;
