import nodemailer from "nodemailer";
import { AppError } from "../../middleware/error.middleware.js";
import { env } from "../../lib/env.js";

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

export function getCandidateEmailConfig() {
  if (
    !env.MAIL_MAILER ||
    !env.MAIL_HOST ||
    !env.MAIL_PORT ||
    !env.MAIL_USERNAME ||
    !env.MAIL_PASSWORD ||
    !env.MAIL_ENCRYPTION ||
    !env.MAIL_FROM_ADDRESS
  ) {
    throw new AppError(
      503,
      "Candidate email verification is not configured. Please contact the assessment administrator.",
      "EMAIL_VERIFICATION_UNAVAILABLE",
    );
  }
  return {
    transport: {
      host: env.MAIL_HOST,
      port: env.MAIL_PORT,
      secure: env.MAIL_ENCRYPTION === "ssl",
      requireTLS: env.MAIL_ENCRYPTION === "tls",
      auth: { user: env.MAIL_USERNAME, pass: env.MAIL_PASSWORD },
    },
    from: {
      name: env.MAIL_FROM_NAME ?? "Aptitude Assessment",
      address: env.MAIL_FROM_ADDRESS,
    },
  };
}

export async function sendCandidateVerificationEmail(email: string, code: string) {
  const { transport, from } = getCandidateEmailConfig();
  if (!transporter) {
    transporter = nodemailer.createTransport(transport);
  }

  try {
    await transporter.sendMail({
      from,
      to: email,
      subject: "Your aptitude assessment verification code",
      text: [
        "Use this one-time code to verify your email and access your aptitude assessment:",
        "",
        code,
        "",
        "The code expires in 15 minutes. If you did not request it, you can ignore this email.",
      ].join("\n"),
    });
  } catch (error) {
    console.error("Candidate verification email delivery failed", error);
    throw new AppError(
      503,
      "The verification email could not be sent. Please try again later.",
      "EMAIL_DELIVERY_FAILED",
    );
  }
}
