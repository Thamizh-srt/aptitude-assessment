import { z } from "zod";

export const candidateIdSchema = z.string().regex(/^[a-z0-9]{20,32}$/i);

const sharedFilters = {
  search: z.string().trim().max(100).default(""),
  resultStatus: z.enum(["ALL", "PASS", "FAIL"]).default("ALL"),
  sortBy: z.enum(["date", "score"]).default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
};

export const candidateListQuerySchema = z.object({
  ...sharedFilters,
  page: z.coerce.number().int().min(1).default(1),
}).strict();

export const candidateExportQuerySchema = z.object(sharedFilters).strict();

export type CandidateListQuery = z.infer<typeof candidateListQuerySchema>;
export type CandidateExportQuery = z.infer<typeof candidateExportQuerySchema>;
