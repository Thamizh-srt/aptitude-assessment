import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assessmentSettingsInputSchema } from "./admin-settings.validation.js";

describe("assessmentSettingsInputSchema", () => {
  it("accepts supported duration and decimal passing threshold values", () => {
    assert.deepEqual(
      assessmentSettingsInputSchema.parse({
        durationMinutes: 180,
        passPercentage: 60.5,
      }),
      { durationMinutes: 180, passPercentage: 60.5 },
    );
  });

  it("rejects fractional or out-of-range durations", () => {
    for (const durationMinutes of [0, 1.5, 181]) {
      assert.equal(
        assessmentSettingsInputSchema.safeParse({
          durationMinutes,
          passPercentage: 60,
        }).success,
        false,
      );
    }
  });

  it("rejects pass percentages outside 0 through 100", () => {
    for (const passPercentage of [-0.1, 100.1]) {
      assert.equal(
        assessmentSettingsInputSchema.safeParse({
          durationMinutes: 15,
          passPercentage,
        }).success,
        false,
      );
    }
  });

  it("rejects unrecognized setting fields", () => {
    assert.equal(
      assessmentSettingsInputSchema.safeParse({
        durationMinutes: 15,
        passPercentage: 60,
        enabled: true,
      }).success,
      false,
    );
  });
});
