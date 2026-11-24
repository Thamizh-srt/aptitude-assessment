export type OptionLetter = "A" | "B" | "C" | "D";

export type QuestionAnswer = {
  id: string;
  position: number;
  text: string;
  options: Record<OptionLetter, string>;
  selectedOption: OptionLetter | null;
  isMarkedForReview: boolean;
};

export type AssessmentResultSummary = {
  status: "SUBMITTED";
  submittedAt: string;
  durationMinutes: number | null;
  timeTakenSeconds: number;
  correctCount: number;
  incorrectCount: number;
  unattemptedCount: number;
  marksDeducted: number;
  netScore: number;
  maxScore: number;
  percentage: number;
  passPercentage: number;
  resultStatus: "PASS" | "FAIL";
};

export type Instructions = {
  status: "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED";
  questionCount: number;
  activeQuestionCount: number;
  available: boolean;
  durationMinutes: number;
  markingScheme: { correct: number; incorrect: number; unanswered: number };
  maxScore: number;
  message: string | null;
};

export type AssessmentState =
  | {
      status: "NOT_STARTED";
      serverNow: string;
      durationMinutes: number | null;
      answers: [];
    }
  | {
      status: "IN_PROGRESS";
      serverNow: string;
      startedAt: string | null;
      deadlineAt: string;
      remainingMs: number;
      durationMinutes: number | null;
      answers: QuestionAnswer[];
    }
  | {
      status: "SUBMITTED";
      serverNow: string;
      result: AssessmentResultSummary;
    };

export type AssessmentResult = AssessmentResultSummary & {
  answers: Array<
    QuestionAnswer & {
      correctOption: OptionLetter;
      isCorrect: boolean;
    }
  >;
};

type ApiErrorPayload = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

export class AssessmentApiError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "AssessmentApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
  } catch {
    throw new AssessmentApiError(
      "We couldn't reach the assessment service. Check your connection and try again.",
      "NETWORK_ERROR",
    );
  }

  const body = (await response.json().catch(() => ({}))) as T | ApiErrorPayload;
  if (!response.ok) {
    const error = (body as ApiErrorPayload).error;
    throw new AssessmentApiError(
      error?.message ?? "The assessment request could not be completed.",
      error?.code,
      response.status,
    );
  }
  return body as T;
}

const assessmentPath = (candidateId: string) =>
  `/api/assessment/${encodeURIComponent(candidateId)}`;

export function getInstructions(candidateId: string) {
  return request<Instructions>(`${assessmentPath(candidateId)}/instructions`);
}

export function startAssessment(candidateId: string) {
  return request<AssessmentState>(`${assessmentPath(candidateId)}/start`, {
    method: "POST",
    body: "{}",
  });
}

export function getAssessmentState(candidateId: string) {
  return request<AssessmentState>(`${assessmentPath(candidateId)}/state`);
}

export function saveAnswer(
  candidateId: string,
  answerId: string,
  update: {
    selectedOption?: OptionLetter | null;
    isMarkedForReview?: boolean;
  },
) {
  return request<AssessmentState>(
    `${assessmentPath(candidateId)}/answers/${encodeURIComponent(answerId)}`,
    { method: "PATCH", body: JSON.stringify(update) },
  );
}

export function submitAssessment(candidateId: string, automatic = false) {
  return request<AssessmentResultSummary>(
    `${assessmentPath(candidateId)}/submit`,
    { method: "POST", body: JSON.stringify({ automatic }) },
  );
}

export function getAssessmentResult(candidateId: string) {
  return request<AssessmentResult>(
    `${assessmentPath(candidateId)}/result`,
  );
}
