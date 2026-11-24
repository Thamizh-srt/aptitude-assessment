export type ScoringAnswer = {
  selectedOption: string | null;
  correctOption: string;
};

export type AssessmentScore = {
  correctCount: number;
  incorrectCount: number;
  unattemptedCount: number;
  marksDeducted: number;
  netScore: number;
  maxScore: 20;
  percentage: number;
  passPercentage: number;
  resultStatus: "PASS" | "FAIL";
};

const QUESTION_COUNT = 10;
const MAX_SCORE = 20;

export function calculateAssessmentScore(
  answers: ScoringAnswer[],
  passPercentage: number,
): AssessmentScore {
  if (answers.length !== QUESTION_COUNT) {
    throw new RangeError(`An assessment must contain exactly ${QUESTION_COUNT} answers.`);
  }
  if (!Number.isFinite(passPercentage) || passPercentage < 0 || passPercentage > 100) {
    throw new RangeError("Pass percentage must be between 0 and 100.");
  }

  const correctCount = answers.filter(
    ({ selectedOption, correctOption }) => selectedOption === correctOption,
  ).length;
  const incorrectCount = answers.filter(
    ({ selectedOption, correctOption }) =>
      selectedOption !== null && selectedOption !== correctOption,
  ).length;
  const unattemptedCount = QUESTION_COUNT - correctCount - incorrectCount;
  const netScore = correctCount * 2 - incorrectCount;
  const percentage = netScore * 5;

  return {
    correctCount,
    incorrectCount,
    unattemptedCount,
    marksDeducted: incorrectCount,
    netScore,
    maxScore: MAX_SCORE,
    percentage,
    passPercentage,
    resultStatus: percentage >= passPercentage ? "PASS" : "FAIL",
  };
}
