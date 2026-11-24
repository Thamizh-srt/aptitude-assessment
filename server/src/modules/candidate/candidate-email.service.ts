import { AppError } from "../../middleware/error.middleware.js";
import { env } from "../../lib/env.js";

const BREVO_EMAIL_API_URL = "https://api.brevo.com/v3/smtp/email";

export function getCandidateEmailConfig() {
  if (!env.BREVO_API_KEY || !env.MAIL_FROM) {
    throw new AppError(
      503,
      "Candidate email verification is not configured. Please contact the assessment administrator.",
      "EMAIL_VERIFICATION_UNAVAILABLE",
    );
  }
  return {
    apiKey: env.BREVO_API_KEY,
    from: { name: "Aptitude Assessment", email: env.MAIL_FROM },
  };
}

export async function sendCandidateVerificationEmail(email: string, code: string) {
  const { apiKey, from } = getCandidateEmailConfig();

  let response: Response;
  try {
    response = await fetch(BREVO_EMAIL_API_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: from,
        to: [{ email }],
        subject: "Your aptitude assessment verification code",
        textContent: [
          "Use this one-time code to verify your email and access your aptitude assessment:",
          "",
          code,
          "",
          "The code expires in 15 minutes. If you did not request it, you can ignore this email.",
        ].join("\n"),
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    console.error("Candidate verification email delivery failed", error);
    throw new AppError(
      503,
      "The verification email could not be sent. Please try again later.",
      "EMAIL_DELIVERY_FAILED",
    );
  }

  if (!response.ok) {
    const responseBody = await response.text();
    console.error("Candidate verification email delivery failed", {
      status: response.status,
      response: responseBody.slice(0, 1000),
    });
    throw new AppError(
      503,
      "The verification email could not be sent. Please try again later.",
      "EMAIL_DELIVERY_FAILED",
    );
  }
}
