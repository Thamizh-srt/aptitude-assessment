import type { Request, Response } from "express";
import {
  createAdminQuestion,
  deleteAdminQuestion,
  listAdminQuestions,
  updateAdminQuestion,
} from "./admin-question.service.js";
import {
  questionInputSchema,
  questionListQuerySchema,
} from "./admin-question.validation.js";

export async function listAdminQuestionsController(req: Request, res: Response) {
  const query = questionListQuerySchema.parse(req.query);
  res.json(await listAdminQuestions(query));
}

export async function createAdminQuestionController(req: Request, res: Response) {
  const input = questionInputSchema.parse(req.body);
  res.status(201).json(await createAdminQuestion(input));
}

export async function updateAdminQuestionController(req: Request, res: Response) {
  const input = questionInputSchema.parse(req.body);
  res.json(await updateAdminQuestion(String(req.params.questionId), input));
}

export async function deleteAdminQuestionController(req: Request, res: Response) {
  res.json(await deleteAdminQuestion(String(req.params.questionId)));
}
