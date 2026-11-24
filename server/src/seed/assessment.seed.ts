import mongoose from "mongoose";
import { connectDatabase } from "../lib/database.js";
import { AssessmentSettings } from "../models/AssessmentSettings.js";
import { Question } from "../models/Question.js";

const questions = [
  {
    text: "A subscription business plans a 20% price increase. What is the largest share of its customers it can lose before monthly revenue falls below today's level?",
    options: { A: "16.7%", B: "20%", C: "15%", D: "18.3%" },
    correctOption: "A",
    category: "Quantitative",
    difficulty: "Medium",
  },
  {
    text: "Six client meetings (P, Q, R, S, T, U) are scheduled Monday to Saturday, one per day. S is on Wednesday. R is the day immediately before U, and U is not on Saturday. Q is later in the week than both P and T. T is not on Monday. Which of the following must be true?",
    options: { A: "P is on Monday", B: "Q is on Saturday", C: "R is on Thursday", D: "T is on Tuesday" },
    correctOption: "B",
    category: "Logical Reasoning",
    difficulty: "Hard",
  },
  {
    text: "Choose the grammatically correct sentence for a project update.",
    options: {
      A: "Neither the manager nor the analysts was aware of the change.",
      B: "Neither the analysts nor the manager were aware of the change.",
      C: "Neither the manager nor the analysts were aware of the change.",
      D: "Neither the manager or the analysts were aware of the change.",
    },
    correctOption: "C",
    category: "Verbal",
    difficulty: "Medium",
  },
  {
    text: "A client project budget is $48,000. If 37.5% is spent on implementation and 25% of the remaining budget is reserved for support, how much remains unallocated?",
    options: { A: "$22,500", B: "$18,000", C: "$21,000", D: "$24,000" },
    correctOption: "A",
    category: "Quantitative",
    difficulty: "Medium",
  },
  {
    text: "A team completes 6 tasks in 9 hours. At the same productivity, how many tasks can the team complete in 21 hours?",
    options: { A: "12", B: "14", C: "13", D: "15" },
    correctOption: "B",
    category: "Quantitative",
    difficulty: "Easy",
  },
  {
    text: "Five consultants, A, B, C, D, and E, present in sequence. C presents immediately after A. E presents before B but after D. D is not first. If B is last, what must be true?",
    options: { A: "A is first", B: "C is before D", C: "D is first", D: "A is before D" },
    correctOption: "D",
    category: "Logical Reasoning",
    difficulty: "Hard",
  },
  {
    text: "A product survey finds that 60% of respondents favor Feature X and 40% favor Feature Y. Half of Feature X supporters and one quarter of Feature Y supporters are repeat customers. Which statement is supported?",
    options: {
      A: "A majority of repeat customers support Feature X",
      B: "Exactly 40% of repeat customers support Feature Y",
      C: "Feature Y has more repeat customers",
      D: "The survey has no repeat-customer data",
    },
    correctOption: "A",
    category: "Logical Reasoning",
    difficulty: "Medium",
  },
  {
    text: "Choose the sentence that most clearly communicates an approved scope change.",
    options: { A: "The scope changed and will have a delay.", B: "The scope is now increased, so delivery moves from Friday to Monday.", C: "Because scope increased, probably Monday.", D: "We may deliver Monday because scope is different." },
    correctOption: "B",
    category: "Verbal",
    difficulty: "Easy",
  },
  {
    text: "A manager says: \"Every customer affected by the outage received an apology.\" Which conclusion necessarily follows?",
    options: { A: "Every person who received an apology was a customer.", B: "Customers not affected by the outage received no apology.", C: "Each customer affected by the outage received an apology.", D: "All affected customers also received compensation." },
    correctOption: "C",
    category: "Logical Reasoning",
    difficulty: "Medium",
  },
  {
    text: "Choose the clearest revision of: \"The report, which was shared with the client, and which included revised forecasts, was late.\"",
    options: { A: "The report was late, shared with the client, and included revised forecasts.", B: "Including revised forecasts, the report was shared late with the client.", C: "The report, including revised forecasts, was shared with the client but submitted late.", D: "The client got the report, including revised forecasts late." },
    correctOption: "C",
    category: "Verbal",
    difficulty: "Medium",
  },
];

async function main() {
  await connectDatabase();
  await Promise.all([AssessmentSettings.init(), Question.init()]);

  await AssessmentSettings.updateOne(
    { key: "singleton" },
    { $setOnInsert: { durationMinutes: 15, passPercentage: 60 } },
    { upsert: true },
  );

  for (const question of questions) {
    await Question.updateOne(
      { text: question.text },
      { $set: { ...question, isActive: true } },
      { upsert: true },
    );
  }

  await Question.updateMany(
    { text: { $nin: questions.map(({ text }) => text) } },
    { $set: { isActive: false } },
  );

  console.log("Seeded 10 active aptitude questions and default assessment settings.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
