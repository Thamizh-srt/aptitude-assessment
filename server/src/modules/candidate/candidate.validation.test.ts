import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { candidateRegistrationSchema } from "./candidate.validation.js";

const validRegistration = {
  fullName: "Alex Morgan",
  email: "ALEX@example.com",
  age: 18,
  phone: "1234567890",
  qualification: "Bachelor's degree",
};

describe("candidateRegistrationSchema", () => {
  it("accepts boundary age and normalizes email casing", () => {
    const parsed = candidateRegistrationSchema.parse(validRegistration);
    assert.equal(parsed.age, 18);
    assert.equal(parsed.email, "alex@example.com");
  });

  it("accepts optional profile fields and the upper age boundary", () => {
    const parsed = candidateRegistrationSchema.parse({
      ...validRegistration,
      age: 60,
      gender: "",
      city: "",
    });
    assert.equal(parsed.age, 60);
    assert.equal(parsed.gender, "");
  });

  it("rejects names outside the letter-and-space rule", () => {
    for (const fullName of ["A", "Alex Morgan2", "Alex-Morgan", "Alex_Morgan"]) {
      assert.equal(
        candidateRegistrationSchema.safeParse({ ...validRegistration, fullName }).success,
        false,
      );
    }
  });

  it("rejects out-of-range ages, invalid phones, and missing qualification", () => {
    for (const update of [
      { age: 17 },
      { age: 61 },
      { phone: "123456789" },
      { phone: "12345678901" },
      { qualification: "" },
    ]) {
      assert.equal(
        candidateRegistrationSchema.safeParse({ ...validRegistration, ...update }).success,
        false,
      );
    }
  });
});
