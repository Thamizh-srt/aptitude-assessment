export type AdminIdentity = {
  id: string;
  name: string;
  email: string;
};

export type AdminDashboard = {
  metrics: {
    totalCandidates: number;
    completedTests: number;
    averageScore: number;
    passRate: number;
    highestScore: number;
    maxScore: number;
  };
  scoreDistribution: Array<{ range: string; count: number }>;
  passFail: Array<{ name: "Pass" | "Fail"; count: number }>;
  recentAttempts: Array<{
    id: string;
    candidateName: string;
    email: string;
    status: "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED";
    resultStatus: "PASS" | "FAIL" | null;
    score: number | null;
    maxScore: number | null;
    percentage: number | null;
    submittedAt: string | null;
    updatedAt: string;
  }>;
};

export type AdminAssessmentSettings = {
  durationMinutes: number;
  passPercentage: number;
  updatedAt: string;
};

export type AdminQuestion = {
  id: string;
  text: string;
  options: { A: string; B: string; C: string; D: string };
  correctOption: "A" | "B" | "C" | "D";
  category: "Quantitative" | "Logical Reasoning" | "Verbal";
  difficulty: "Easy" | "Medium" | "Hard";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminQuestionInput = Omit<AdminQuestion, "id" | "createdAt" | "updatedAt">;

export type AdminQuestionList = {
  questions: AdminQuestion[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  activeQuestionCount: number;
  requiredActiveQuestionCount: number;
  canStartAssessment: boolean;
};

export type CandidateFilters = {
  search?: string;
  resultStatus?: "ALL" | "PASS" | "FAIL";
  sortBy?: "date" | "score";
  sortOrder?: "asc" | "desc";
};

export type AdminCandidate = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  age: number;
  score: number | null;
  maxScore: number | null;
  percentage: number | null;
  resultStatus: "PASS" | "FAIL" | null;
  attemptStatus: "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED";
  attemptDate: string | null;
};

export type AdminCandidateList = {
  candidates: AdminCandidate[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

export type AdminCandidateDetail = {
  candidate: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    age: number;
    gender: string | null;
    qualification: string;
    city: string | null;
    registeredAt: string;
  };
  attempt: null | {
    status: "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED";
    startedAt: string | null;
    submittedAt: string | null;
    durationMinutes: number | null;
    timeTakenSeconds: number | null;
    score: number | null;
    maxScore: number | null;
    percentage: number | null;
    correctCount: number | null;
    incorrectCount: number | null;
    unattemptedCount: number | null;
    marksDeducted: number | null;
    passPercentage: number | null;
    resultStatus: "PASS" | "FAIL" | null;
  };
  answers: Array<{
    id: string;
    position: number;
    text: string;
    options: { A: string; B: string; C: string; D: string };
    selectedOption: "A" | "B" | "C" | "D" | null;
    correctOption: "A" | "B" | "C" | "D";
    isCorrect: boolean;
    isMarkedForReview: boolean;
  }>;
};

type ApiError = {
  error?: {
    message?: string;
  };
};

export class AdminApiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "AdminApiError";
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
    throw new AdminApiError("We couldn't reach the administrator service. Try again.");
  }

  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new AdminApiError(
      (body as ApiError).error?.message ?? "The request could not be completed.",
      response.status,
    );
  }
  return body as T;
}

export async function loginAdmin(email: string, password: string) {
  return request<{ admin: AdminIdentity; expiresAt: string }>("/api/admin/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function getAdminSession() {
  return request<{ admin: AdminIdentity }>("/api/admin/auth/session");
}

export async function logoutAdmin() {
  return request<void>("/api/admin/auth/logout", { method: "POST" });
}

export async function getAdminDashboard() {
  return request<AdminDashboard>("/api/admin/dashboard");
}

export function getAdminAssessmentSettings() {
  return request<AdminAssessmentSettings>("/api/admin/settings");
}

export function updateAdminAssessmentSettings(input: {
  durationMinutes: number;
  passPercentage: number;
}) {
  return request<AdminAssessmentSettings>("/api/admin/settings", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function getAdminQuestions(
  filters: {
    category?: string;
    difficulty?: string;
    status?: "ALL" | "ACTIVE" | "INACTIVE";
    page?: number;
  } = {},
) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  return request<AdminQuestionList>(
    `/api/admin/questions${query.size ? `?${query.toString()}` : ""}`,
  );
}

export function createAdminQuestion(input: AdminQuestionInput) {
  return request<AdminQuestion>("/api/admin/questions", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAdminQuestion(id: string, input: AdminQuestionInput) {
  return request<AdminQuestion>(`/api/admin/questions/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteAdminQuestion(id: string) {
  return request<{
    activeQuestionCount: number;
    requiredActiveQuestionCount: number;
    canStartAssessment: boolean;
  }>(`/api/admin/questions/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function getAdminCandidates(
  filters: CandidateFilters & { page: number },
) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined) query.set(key, String(value));
  }
  return request<AdminCandidateList>(`/api/admin/candidates?${query.toString()}`);
}

export function getAdminCandidate(id: string) {
  return request<AdminCandidateDetail>(
    `/api/admin/candidates/${encodeURIComponent(id)}`,
  );
}

export async function downloadCandidateCsv(filters: CandidateFilters = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  let response: Response;
  try {
    response = await fetch(
      `/api/admin/candidates/export.csv${query.size ? `?${query.toString()}` : ""}`,
      { credentials: "include" },
    );
  } catch {
    throw new AdminApiError("We couldn't reach the administrator service. Try again.");
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiError;
    throw new AdminApiError(
      body.error?.message ?? "The CSV export couldn't be generated.",
      response.status,
    );
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = query.size ? "candidate-results-filtered.csv" : "candidate-results-all.csv";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}
