import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateAssessmentScore, type ScoringAnswer } from "./assessment.scoring.js";

function answers(correct: number, incorrect: number): ScoringAnswer[] {
  return [
    ...Array.from({ length: correct }, () => ({
      selectedOption: "A",
      correctOption: "A",
    })),
    ...Array.from({ length: incorrect }, () => ({
      selectedOption: "B",
      correctOption: "A",
    })),
    ...Array.from({ length: 10 - correct - incorrect }, () => ({
      selectedOption: null,
      correctOption: "A",
    })),
  ];
}

describe("calculateAssessmentScore", () => {
  it("awards the full 20 points and 100 percent for ten correct answers", () => {
    assert.deepEqual(calculateAssessmentScore(answers(10, 0), 60), {
      correctCount: 10,
      incorrectCount: 0,
      unattemptedCount: 0,
      marksDeducted: 0,
      netScore: 20,
      maxScore: 20,
      percentage: 100,
      passPercentage: 60,
      resultStatus: "PASS",
    });
  });

  it("supports a negative score without clamping it to zero", () => {
    const result = calculateAssessmentScore(answers(0, 10), 60);
    assert.equal(result.netScore, -10);
    assert.equal(result.percentage, -50);
    assert.equal(result.marksDeducted, 10);
    assert.equal(result.resultStatus, "FAIL");
  });

  it("gives unanswered questions zero marks", () => {
    const result = calculateAssessmentScore(answers(0, 0), 60);
    assert.equal(result.netScore, 0);
    assert.equal(result.percentage, 0);
    assert.equal(result.unattemptedCount, 10);
    assert.equal(result.resultStatus, "FAIL");
  });

  it("passes at the exact 60 percent cutoff", () => {
    const result = calculateAssessmentScore(answers(7, 2), 60);
    assert.equal(result.netScore, 12);
    assert.equal(result.percentage, 60);
    assert.equal(result.resultStatus, "PASS");
    assert.equal(result.unattemptedCount, 1);
  });

  it("fails immediately below the configured cutoff", () => {
    const result = calculateAssessmentScore(answers(7, 3), 60);
    assert.equal(result.netScore, 11);
    assert.equal(result.percentage, 55);
    assert.equal(result.resultStatus, "FAIL");
  });

  it("supports a zero pass threshold at the zero-score boundary", () => {
    const result = calculateAssessmentScore(answers(0, 0), 0);
    assert.equal(result.resultStatus, "PASS");
  });

  it("rejects incomplete answer sets and out-of-range pass thresholds", () => {
    assert.throws(() => calculateAssessmentScore(answers(1, 1).slice(1), 60), RangeError);
    assert.throws(() => calculateAssessmentScore(answers(0, 0), -1), RangeError);
    assert.throws(() => calculateAssessmentScore(answers(0, 0), 101), RangeError);
  });
});
