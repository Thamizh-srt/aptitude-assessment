import type { Request, Response } from "express";
import {
  getAssessmentResult,
  getAssessmentState,
  getInstructions,
  startAssessment,
  submitAttempt,
  updateCandidateAnswer,
} from "./assessment.service.js";

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export async function instructionsController(req: Request, res: Response) {
  res.json(await getInstructions(param(req.params.candidateId)));
}

export async function startController(req: Request, res: Response) {
  res.json(await startAssessment(param(req.params.candidateId)));
}

export async function stateController(req: Request, res: Response) {
  res.json(await getAssessmentState(param(req.params.candidateId)));
}

export async function answerController(req: Request, res: Response) {
  res.json(
    await updateCandidateAnswer(
      param(req.params.candidateId),
      param(req.params.answerId),
      req.body,
    ),
  );
}

export async function submitController(req: Request, res: Response) {
  const result = await submitAttempt(
    param(req.params.candidateId),
    req.body.automatic,
  );
  res.json(result);
}

export async function resultController(req: Request, res: Response) {
  res.json(await getAssessmentResult(param(req.params.candidateId)));
}
