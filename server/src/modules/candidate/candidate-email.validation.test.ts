import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { candidateEmailVerificationSchema } from "./candidate-email.validation.js";

describe("candidateEmailVerificationSchema", () => {
  it("normalizes the email and accepts an eight-digit code", () => {
    const parsed = candidateEmailVerificationSchema.parse({
      email: "ALEX@example.com",
      code: "00420179",
    });
    assert.equal(parsed.email, "alex@example.com");
    assert.equal(parsed.code, "00420179");
  });

  it("rejects malformed codes and unexpected fields", () => {
    for (const code of ["1234567", "123456789", "12AB5678"]) {
      assert.equal(
        candidateEmailVerificationSchema.safeParse({
          email: "alex@example.com",
          code,
        }).success,
        false,
      );
    }

    assert.equal(
      candidateEmailVerificationSchema.safeParse({
        email: "alex@example.com",
        code: "00420179",
        candidateId: "untrusted",
      }).success,
      false,
    );
  });
});
