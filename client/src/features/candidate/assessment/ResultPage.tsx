import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  CircleX,
  Clock3,
  MinusCircle,
  ShieldCheck,
} from "lucide-react";
import {
  AssessmentApiError,
  getAssessmentResult,
  getAssessmentState,
  type AssessmentResult,
} from "./assessment.api";

function ResultPage() {
  const { candidateId = "" } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getAssessmentResult(candidateId)
      .then((response) => {
        if (active) setResult(response);
      })
      .catch(async (cause) => {
        if (cause instanceof AssessmentApiError && cause.code === "RESULT_NOT_READY") {
          try {
            const state = await getAssessmentState(candidateId);
            if (!active) return;
            navigate(
              state.status === "IN_PROGRESS"
                ? `/assessment/${candidateId}/test`
                : `/assessment/${candidateId}/instructions`,
              { replace: true },
            );
            return;
          } catch {
            if (active) setError("We couldn't verify your assessment status.");
            return;
          }
        }
        if (active) {
          setError(
            cause instanceof AssessmentApiError
              ? cause.message
              : "Your result couldn't be loaded.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [candidateId, navigate]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div role="alert" className="max-w-lg rounded-2xl border border-rose-200 bg-white p-7 text-center shadow-sm">
          <CircleX className="mx-auto h-8 w-8 text-rose-600" aria-hidden="true" />
          <h1 className="mt-4 text-xl font-semibold text-slate-950">Result unavailable</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">{error}</p>
        </div>
      </main>
    );
  }

  if (!result) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="animate-pulse text-sm font-medium text-slate-500">Loading your result…</p>
      </main>
    );
  }

  const passed = result.resultStatus === "PASS";
  const elapsedMinutes = Math.floor(result.timeTakenSeconds / 60);
  const elapsedSeconds = result.timeTakenSeconds % 60;

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-8 sm:px-6 lg:py-12">
      <div className="mx-auto max-w-4xl">
        <header className="mb-7 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-semibold text-slate-950">Aptitude Assessment</p>
            <p className="text-xs text-slate-500">Assessment result</p>
          </div>
        </header>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className={`px-6 py-8 sm:px-10 sm:py-10 ${passed ? "bg-emerald-50/70" : "bg-slate-50"}`}>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold tracking-wide ${
                  passed ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
                }`}>
                  {passed
                    ? <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                    : <CircleX className="h-4 w-4" aria-hidden="true" />}
                  {passed ? "PASS" : "FAIL"}
                </span>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
                  Assessment submitted
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Your responses have been recorded. This result is final.
                </p>
              </div>
              <div className="rounded-2xl border border-white bg-white/80 px-6 py-5 text-center shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total score</p>
                <p className="mt-1 text-4xl font-bold tabular-nums text-slate-950">
                  {result.netScore}
                  <span className="text-lg font-medium text-slate-400"> / {result.maxScore}</span>
                </p>
                <p className="mt-1 text-sm font-semibold text-indigo-700">
                  {result.percentage.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-px bg-slate-100 sm:grid-cols-2 lg:grid-cols-5">
            <div className="bg-white p-5">
              <p className="text-sm text-slate-500">Correct</p>
              <p className="mt-2 flex items-center gap-2 text-2xl font-semibold text-emerald-700">
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                {result.correctCount}
              </p>
            </div>
            <div className="bg-white p-5">
              <p className="text-sm text-slate-500">Incorrect</p>
              <p className="mt-2 flex items-center gap-2 text-2xl font-semibold text-rose-700">
                <CircleX className="h-5 w-5" aria-hidden="true" />
                {result.incorrectCount}
              </p>
            </div>
            <div className="bg-white p-5">
              <p className="text-sm text-slate-500">Unanswered</p>
              <p className="mt-2 flex items-center gap-2 text-2xl font-semibold text-slate-700">
                <MinusCircle className="h-5 w-5" aria-hidden="true" />
                {result.unattemptedCount}
              </p>
            </div>
            <div className="bg-white p-5">
              <p className="text-sm text-slate-500">Marks deducted</p>
              <p className="mt-2 text-2xl font-semibold text-slate-700">
                −{result.marksDeducted}
              </p>
            </div>
            <div className="bg-white p-5">
              <p className="text-sm text-slate-500">Time taken</p>
              <p className="mt-2 flex items-center gap-2 text-lg font-semibold text-slate-700">
                <Clock3 className="h-4 w-4" aria-hidden="true" />
                {elapsedMinutes}m {String(elapsedSeconds).padStart(2, "0")}s
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-6 py-4 text-sm sm:px-10">
            <p className="flex items-center gap-2 text-slate-500">
              <Clock3 className="h-4 w-4" aria-hidden="true" />
              Submitted {new Date(result.submittedAt).toLocaleString()}
            </p>
            <p className="font-medium text-slate-600">
              Pass threshold at submission: {result.passPercentage}%
            </p>
          </div>
        </section>

        <section className="mt-7">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-950">Answer review</h2>
            <p className="mt-1 text-sm text-slate-500">
              Correct answers are shown now that your assessment is submitted.
            </p>
          </div>
          <div className="space-y-3">
            {result.answers.map((answer) => (
              <article key={answer.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
                    {answer.position + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold leading-6 text-slate-900">
                      {answer.text}
                    </h3>
                    <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                      <p className={answer.isCorrect ? "text-emerald-700" : "text-slate-600"}>
                        <span className="font-semibold">Your answer: </span>
                        {answer.selectedOption
                          ? `${answer.selectedOption}. ${answer.options[answer.selectedOption]}`
                          : "Unanswered"}
                      </p>
                      <p className="text-emerald-700">
                        <span className="font-semibold">Correct answer: </span>
                        {answer.correctOption}. {answer.options[answer.correctOption]}
                      </p>
                    </div>
                    {answer.isMarkedForReview && (
                      <p className="mt-2 text-xs font-medium text-amber-700">Marked for review</p>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <button
          type="button"
          onClick={() => navigate("/")}
          className="cursor-pointer mt-7 inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-200/70 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Return to candidate portal
        </button>
      </div>
    </main>
  );
}

export default ResultPage;
