import { createApp } from "./app.js";
import { env } from "./lib/env.js";
import mongoose from "mongoose";
import { connectDatabase } from "./lib/database.js";
import { Admin } from "./models/Admin.js";
import { AdminSession } from "./models/AdminSession.js";
import { AssessmentAttempt } from "./models/AssessmentAttempt.js";
import { AssessmentSettings } from "./models/AssessmentSettings.js";
import { Candidate } from "./models/Candidate.js";
import { CandidateSession } from "./models/CandidateSession.js";
import { CandidateVerification } from "./models/CandidateVerification.js";
import { CandidateAnswer } from "./models/CandidateAnswer.js";
import { Question } from "./models/Question.js";
import { startExpiredAttemptWorker } from "./modules/assessment/assessment.service.js";

const app = createApp();

await connectDatabase();
await Promise.all([
  Admin.init(),
  AdminSession.init(),
  AssessmentAttempt.init(),
  AssessmentSettings.init(),
  Candidate.init(),
  CandidateSession.init(),
  CandidateVerification.init(),
  CandidateAnswer.init(),
  Question.init(),
]);
startExpiredAttemptWorker();
const server = app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
});

async function shutdown(signal: string) {
  console.log(`Received ${signal}; shutting down`);
  server.close(async () => {
    await mongoose.disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
