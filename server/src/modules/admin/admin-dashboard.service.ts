import { AssessmentAttempt } from "../../models/AssessmentAttempt.js";
import { Candidate } from "../../models/Candidate.js";

const SCORE_BANDS = ["-10 to 0", "1 to 5", "6 to 10", "11 to 15", "16 to 20"] as const;

export async function getAdminDashboard() {
  const [totalCandidates, aggregateRows, distributionRows, attempts] =
    await Promise.all([
      Candidate.countDocuments(),
      AssessmentAttempt.aggregate<{
        averageScore: number | null;
        highestScore: number | null;
        passed: number;
        failed: number;
        completed: number;
      }>([
        { $match: { status: "SUBMITTED", netScore: { $ne: null } } },
        {
          $group: {
            _id: null,
            averageScore: { $avg: "$netScore" },
            highestScore: { $max: "$netScore" },
            passed: { $sum: { $cond: [{ $eq: ["$resultStatus", "PASS"] }, 1, 0] } },
            failed: { $sum: { $cond: [{ $eq: ["$resultStatus", "FAIL"] }, 1, 0] } },
            completed: { $sum: 1 },
          },
        },
      ]),
      AssessmentAttempt.aggregate<{ _id: string; count: number }>([
        { $match: { status: "SUBMITTED", netScore: { $ne: null } } },
        {
          $project: {
            scoreBand: {
              $switch: {
                branches: [
                  { case: { $lte: ["$netScore", 0] }, then: SCORE_BANDS[0] },
                  { case: { $lte: ["$netScore", 5] }, then: SCORE_BANDS[1] },
                  { case: { $lte: ["$netScore", 10] }, then: SCORE_BANDS[2] },
                  { case: { $lte: ["$netScore", 15] }, then: SCORE_BANDS[3] },
                ],
                default: SCORE_BANDS[4],
              },
            },
          },
        },
        { $group: { _id: "$scoreBand", count: { $sum: 1 } } },
      ]),
      AssessmentAttempt.find({})
        .sort({ updatedAt: -1 })
        .limit(8)
        .select(
          "_id candidateId status resultStatus netScore maxScore percentage submittedAt updatedAt",
        )
        .lean(),
    ]);

  const stats = aggregateRows[0];
  const candidateIds = [...new Set(attempts.map((attempt) => attempt.candidateId))];
  const candidates = await Candidate.find({ _id: { $in: candidateIds } })
    .select("_id fullName email")
    .lean();
  const candidateById = new Map(candidates.map((candidate) => [candidate._id, candidate]));
  const distributionByBand = new Map(
    distributionRows.map((entry) => [entry._id, entry.count]),
  );
  const completedTests = stats?.completed ?? 0;
  const passCount = stats?.passed ?? 0;

  return {
    metrics: {
      totalCandidates,
      completedTests,
      averageScore: stats?.averageScore ?? 0,
      passRate: completedTests === 0 ? 0 : (passCount / completedTests) * 100,
      highestScore: stats?.highestScore ?? 0,
      maxScore: 20,
    },
    scoreDistribution: SCORE_BANDS.map((band) => ({
      range: band,
      count: distributionByBand.get(band) ?? 0,
    })),
    passFail: [
      { name: "Pass", count: passCount },
      { name: "Fail", count: stats?.failed ?? 0 },
    ],
    recentAttempts: attempts.map((attempt) => {
      const candidate = candidateById.get(attempt.candidateId);
      return {
        id: String(attempt._id),
        candidateName: candidate?.fullName ?? "Candidate record unavailable",
        email: candidate?.email ?? "",
        status: attempt.status,
        resultStatus: attempt.resultStatus,
        score: attempt.netScore,
        maxScore: attempt.maxScore,
        percentage: attempt.percentage,
        submittedAt: attempt.submittedAt,
        updatedAt: attempt.updatedAt,
      };
    }),
  };
}
