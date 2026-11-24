import mongoose from "mongoose";
import { AssessmentSettings } from "../../models/AssessmentSettings.js";
import { Question } from "../../models/Question.js";
import { AppError } from "../../middleware/error.middleware.js";
import type {
  QuestionInput,
  QuestionListQuery,
} from "./admin-question.validation.js";

const QUESTIONS_PER_PAGE = 20;
const MAX_ACTIVE_QUESTIONS = 10;

function questionDto(question: {
  _id: unknown;
  text: string;
  options: { A: string; B: string; C: string; D: string };
  correctOption: string;
  category: string;
  difficulty: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: String(question._id),
    text: question.text,
    options: question.options,
    correctOption: question.correctOption,
    category: question.category,
    difficulty: question.difficulty,
    isActive: question.isActive,
    createdAt: question.createdAt,
    updatedAt: question.updatedAt,
  };
}

function ensureQuestionId(questionId: string) {
  if (!/^[a-f\d]{24}$/i.test(questionId)) {
    throw new AppError(404, "Question not found.", "QUESTION_NOT_FOUND");
  }
}

async function lockQuestionBank(session: mongoose.ClientSession) {
  const settings = await AssessmentSettings.findOneAndUpdate(
    { key: "singleton" },
    { $inc: { questionBankRevision: 1 } },
    { new: true, session },
  );
  if (!settings) {
    throw new AppError(503, "Assessment settings are unavailable.", "SETTINGS_UNAVAILABLE");
  }
}

async function activeCount(session?: mongoose.ClientSession) {
  return Question.countDocuments({ isActive: true }).session(session ?? null);
}

export async function listAdminQuestions(query: QuestionListQuery) {
  const filter: Record<string, unknown> = {};
  if (query.category) filter.category = query.category;
  if (query.difficulty) filter.difficulty = query.difficulty;
  if (query.status === "ACTIVE") filter.isActive = true;
  if (query.status === "INACTIVE") filter.isActive = false;

  const [questions, total, activeQuestionCount] = await Promise.all([
    Question.find(filter)
      .sort({ isActive: -1, category: 1, createdAt: -1, _id: 1 })
      .skip((query.page - 1) * QUESTIONS_PER_PAGE)
      .limit(QUESTIONS_PER_PAGE)
      .lean(),
    Question.countDocuments(filter),
    Question.countDocuments({ isActive: true }),
  ]);
  return {
    questions: questions.map(questionDto),
    pagination: {
      page: query.page,
      pageSize: QUESTIONS_PER_PAGE,
      total,
      totalPages: Math.ceil(total / QUESTIONS_PER_PAGE),
    },
    activeQuestionCount,
    requiredActiveQuestionCount: MAX_ACTIVE_QUESTIONS,
    canStartAssessment: activeQuestionCount === MAX_ACTIVE_QUESTIONS,
  };
}

export async function createAdminQuestion(input: QuestionInput) {
  const session = await mongoose.startSession();
  let createdId = "";
  try {
    await session.withTransaction(async () => {
      await lockQuestionBank(session);
      if (input.isActive && (await activeCount(session)) >= MAX_ACTIVE_QUESTIONS) {
        throw new AppError(
          409,
          "The question bank already has 10 active questions. Deactivate one before activating another.",
          "ACTIVE_QUESTION_LIMIT",
        );
      }

      const [question] = await Question.create([input], { session });
      if (!question) {
        throw new AppError(500, "Question could not be created.", "QUESTION_CREATE_FAILED");
      }
      createdId = String(question._id);
    });
  } finally {
    await session.endSession();
  }

  const question = await Question.findById(createdId).lean();
  if (!question) {
    throw new AppError(500, "Question could not be created.", "QUESTION_CREATE_FAILED");
  }
  return questionDto(question);
}

export async function updateAdminQuestion(questionId: string, input: QuestionInput) {
  ensureQuestionId(questionId);
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await lockQuestionBank(session);
      const current = await Question.findById(questionId).session(session);
      if (!current) throw new AppError(404, "Question not found.", "QUESTION_NOT_FOUND");
      if (
        input.isActive &&
        !current.isActive &&
        (await activeCount(session)) >= MAX_ACTIVE_QUESTIONS
      ) {
        throw new AppError(
          409,
          "The question bank already has 10 active questions. Deactivate one before activating another.",
          "ACTIVE_QUESTION_LIMIT",
        );
      }
      current.set(input);
      await current.save({ session });
    });
  } finally {
    await session.endSession();
  }

  const question = await Question.findById(questionId).lean();
  if (!question) throw new AppError(404, "Question not found.", "QUESTION_NOT_FOUND");
  return questionDto(question);
}

export async function deleteAdminQuestion(questionId: string) {
  ensureQuestionId(questionId);
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await lockQuestionBank(session);
      const deleted = await Question.deleteOne({ _id: questionId }, { session });
      if (deleted.deletedCount !== 1) {
        throw new AppError(404, "Question not found.", "QUESTION_NOT_FOUND");
      }
    });
  } finally {
    await session.endSession();
  }

  const activeQuestionCount = await Question.countDocuments({ isActive: true });
  return {
    activeQuestionCount,
    requiredActiveQuestionCount: MAX_ACTIVE_QUESTIONS,
    canStartAssessment: activeQuestionCount === MAX_ACTIVE_QUESTIONS,
  };
}
