import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { questionInputSchema } from "./admin-question.validation.js";

const validQuestion = {
  text: "Which option is the correct answer?",
  options: { A: "One", B: "Two", C: "Three", D: "Four" },
  correctOption: "B",
  category: "Verbal",
  difficulty: "Easy",
  isActive: false,
};

describe("questionInputSchema", () => {
  it("accepts exactly four options and one correct option", () => {
    assert.equal(questionInputSchema.safeParse(validQuestion).success, true);
  });

  it("rejects missing and additional options", () => {
    const { D: _removed, ...threeOptions } = validQuestion.options;
    assert.equal(
      questionInputSchema.safeParse({ ...validQuestion, options: threeOptions }).success,
      false,
    );
    assert.equal(
      questionInputSchema.safeParse({
        ...validQuestion,
        options: { ...validQuestion.options, E: "Five" },
      }).success,
      false,
    );
  });

  it("rejects a correct answer that is not one of the four option keys", () => {
    assert.equal(
      questionInputSchema.safeParse({ ...validQuestion, correctOption: "E" }).success,
      false,
    );
  });
});
