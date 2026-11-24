import mongoose from "mongoose";
import { connectDatabase } from "../lib/database.js";
import { Admin } from "../models/Admin.js";
import { Candidate } from "../models/Candidate.js";
import { Question } from "../models/Question.js";
import { AssessmentSettings } from "../models/AssessmentSettings.js";
import { AssessmentAttempt } from "../models/AssessmentAttempt.js";
import { CandidateAnswer } from "../models/CandidateAnswer.js";

async function main() {
  await connectDatabase();

  await Promise.all([
    Admin.init(),
    Candidate.init(),
    Question.init(),
    AssessmentSettings.init(),
    AssessmentAttempt.init(),
    CandidateAnswer.init(),
  ]);

  await mongoose.connection.collection("assessment_settings").updateOne(
    { key: "singleton" },
    { $setOnInsert: { durationMinutes: 15, passPercentage: 60 } },
    { upsert: true },
  );

  console.log("MongoDB migration 001_init_indexes completed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
