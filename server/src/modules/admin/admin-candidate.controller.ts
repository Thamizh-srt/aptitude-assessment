import type { Request, Response } from "express";
import {
  exportAdminCandidates,
  getAdminCandidate,
  listAdminCandidates,
} from "./admin-candidate.service.js";
import {
  candidateExportQuerySchema,
  candidateListQuerySchema,
} from "./admin-candidate.validation.js";

export async function listAdminCandidatesController(req: Request, res: Response) {
  const query = candidateListQuerySchema.parse(req.query);
  res.json(await listAdminCandidates(query));
}

export async function getAdminCandidateController(req: Request, res: Response) {
  res.json(await getAdminCandidate(String(req.params.candidateId)));
}

export async function exportAdminCandidatesController(req: Request, res: Response) {
  const query = candidateExportQuerySchema.parse(req.query);
  const csv = await exportAdminCandidates(query);
  const filtered = query.search.length > 0 || query.resultStatus !== "ALL";
  res
    .set({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="candidate-results-${filtered ? "filtered" : "all"}.csv"`,
      "Cache-Control": "no-store",
    })
    .send(csv);
}
