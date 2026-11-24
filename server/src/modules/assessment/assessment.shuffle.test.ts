import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shuffle } from "./assessment.shuffle.js";

describe("shuffle", () => {
  it("randomizes order without mutating or losing questions", () => {
    const questions = ["A", "B", "C", "D", "E"];
    const limits: number[] = [];
    const shuffled = shuffle(questions, (maxExclusive) => {
      limits.push(maxExclusive);
      return 0;
    });

    assert.deepEqual(shuffled, ["B", "C", "D", "E", "A"]);
    assert.deepEqual(questions, ["A", "B", "C", "D", "E"]);
    assert.deepEqual(limits, [5, 4, 3, 2]);
    assert.deepEqual([...shuffled].sort(), [...questions].sort());
  });

  it("rejects an invalid random index", () => {
    assert.throws(() => shuffle([1, 2], () => 2), RangeError);
  });
});
