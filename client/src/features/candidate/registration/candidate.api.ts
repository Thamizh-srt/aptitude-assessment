import type { RegistrationValues } from "./registration.schema";

type CandidateVerificationResponse = {
  message: string;
  resumed: boolean;
  candidate: {
    id: string;
    fullName: string;
    email: string;
    createdAt: string;
  };
};

type MessageResponse = { message: string };

type ApiErrorResponse = {
  error?: {
    code?: string;
    message?: string;
    details?: {
      fieldErrors?: Record<string, string[] | undefined>;
    };
  };
};

export class RegistrationError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly fieldErrors?: Record<string, string[] | undefined>,
  ) {
    super(message);
    this.name = "RegistrationError";
  }
}

export async function registerCandidate(
  values: RegistrationValues,
): Promise<MessageResponse> {
  return request("/api/candidates/register", values);
}

export async function verifyCandidateEmail(
  email: string,
  code: string,
): Promise<CandidateVerificationResponse> {
  return request("/api/candidates/verify-email", { email, code });
}

async function request<T extends MessageResponse>(
  path: string,
  payload: unknown,
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
  } catch {
    throw new RegistrationError(
      "We couldn't reach the registration service. Check your connection and try again.",
      "NETWORK_ERROR",
    );
  }

  const body = (await response.json().catch(() => ({}))) as T | ApiErrorResponse;

  if (!response.ok) {
    const error = "error" in body ? body.error : undefined;
    throw new RegistrationError(
      error?.message ?? "Registration couldn't be completed. Please try again.",
      error?.code,
      error?.details?.fieldErrors,
    );
  }

  return body as T;
}
