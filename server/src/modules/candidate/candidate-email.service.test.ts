import assert from "node:assert/strict";
import { it } from "node:test";

process.env.MONGO_URI = "mongodb://127.0.0.1:27017/aptitude-test";
process.env.ADMIN_EMAIL = "admin@example.com";
process.env.ADMIN_PASSWORD = "test-password";
process.env.BREVO_API_KEY = "test-brevo-api-key";
process.env.MAIL_FROM = "verified@example.com";

const { sendCandidateVerificationEmail } = await import("./candidate-email.service.js");

it("sends verification email through the Brevo HTTPS API", async () => {
  const originalFetch = globalThis.fetch;
  let requestUrl = "";
  let requestInit: RequestInit | undefined;

  globalThis.fetch = async (input, init) => {
    requestUrl = String(input);
    requestInit = init;
    return new Response(null, { status: 201 });
  };

  try {
    await sendCandidateVerificationEmail("candidate@example.com", "00420179");
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(requestUrl, "https://api.brevo.com/v3/smtp/email");
  assert.equal(requestInit?.method, "POST");
  assert.equal(new Headers(requestInit?.headers).get("api-key"), "test-brevo-api-key");
  assert.deepEqual(JSON.parse(String(requestInit?.body)), {
    sender: { name: "Aptitude Assessment", email: "verified@example.com" },
    to: [{ email: "candidate@example.com" }],
    subject: "Your aptitude assessment verification code",
    textContent: [
      "Use this one-time code to verify your email and access your aptitude assessment:",
      "",
      "00420179",
      "",
      "The code expires in 15 minutes. If you did not request it, you can ignore this email.",
    ].join("\n"),
  });
});
