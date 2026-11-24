import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, CircleHelp, XCircle } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import {
  AdminApiError,
  getAdminCandidate,
  type AdminCandidateDetail,
} from "./admin.api";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "long", timeStyle: "short" }).format(new Date(value));
}

function formatDuration(seconds: number | null) {
  if (seconds === null) return "—";
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes ? `${minutes}m ${remainder}s` : `${remainder}s`;
}

export default function CandidateDetailPage() {
  const { candidateId = "" } = useParams();
  const [detail, setDetail] = useState<AdminCandidateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    getAdminCandidate(candidateId)
      .then((response) => {
        if (active) setDetail(response);
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(
            requestError instanceof AdminApiError
              ? requestError.message
              : "Candidate details couldn't be loaded.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [candidateId]);

  if (loading) {
    return <p className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading candidate details…</p>;
  }
  if (error || !detail) {
    return (
      <section>
        <Link to="/admin/candidates" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-700">
          <ArrowLeft className="h-4 w-4" /> Back to candidates
        </Link>
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error || "Candidate not found."}
        </p>
      </section>
    );
  }

  const { candidate, attempt, answers } = detail;

  return (
    <section>
      <Link to="/admin/candidates" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-700">
        <ArrowLeft className="h-4 w-4" />
        Back to candidates
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Candidate record</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-[30px]">{candidate.fullName}</h1>
          <p className="mt-1 text-sm text-slate-500">{candidate.email}</p>
        </div>
        {attempt?.resultStatus && (
          <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${attempt.resultStatus === "PASS" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
            {attempt.resultStatus}
          </span>
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Candidate information</h2>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4">
              {[
                ["Phone", candidate.phone],
                ["Age", String(candidate.age)],
                ["Qualification", candidate.qualification],
                ["City", candidate.city || "—"],
                ["Gender", candidate.gender || "—"],
                ["Registered", formatDate(candidate.registeredAt)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
                  <dd className="mt-1 text-sm font-medium text-slate-700">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Assessment result</h2>
            {!attempt ? (
              <p className="mt-4 text-sm text-slate-500">No assessment attempt is recorded.</p>
            ) : (
              <>
                <div className="mt-4 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-slate-500">Total score</p>
                    <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
                      {attempt.score === null ? "—" : `${attempt.score}`}
                      {attempt.score !== null && <span className="text-lg font-medium text-slate-400"> / {attempt.maxScore ?? 20}</span>}
                    </p>
                  </div>
                  <p className="text-xl font-semibold text-indigo-700">{attempt.percentage === null ? "—" : `${attempt.percentage}%`}</p>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  {[
                    ["Status", attempt.status.replace("_", " ")],
                    ["Pass threshold", attempt.passPercentage === null ? "—" : `${attempt.passPercentage}%`],
                    ["Correct", attempt.correctCount === null ? "—" : String(attempt.correctCount)],
                    ["Incorrect", attempt.incorrectCount === null ? "—" : String(attempt.incorrectCount)],
                    ["Unanswered", attempt.unattemptedCount === null ? "—" : String(attempt.unattemptedCount)],
                    ["Marks deducted", attempt.marksDeducted === null ? "—" : String(attempt.marksDeducted)],
                    ["Time taken", formatDuration(attempt.timeTakenSeconds)],
                    ["Submitted", formatDate(attempt.submittedAt)],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-slate-50 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-700">{value}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Question-by-question review</h2>
              <p className="mt-1 text-xs text-slate-500">Saved question snapshots preserve the historical answer key.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{answers.length} questions</span>
          </header>
          {answers.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-14 text-center">
              <CircleHelp className="h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-medium text-slate-600">No saved answers to review.</p>
              <p className="mt-1 text-xs text-slate-400">Question review will appear after the assessment starts.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {answers.map((answer) => (
                <article key={answer.id} className="p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">{answer.position + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold leading-6 text-slate-800">{answer.text}</h3>
                        {answer.isMarkedForReview && <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">Marked for review</span>}
                      </div>
                      <div className="mt-3 space-y-2">
                        {(["A", "B", "C", "D"] as const).map((letter) => {
                          const isCorrect = letter === answer.correctOption;
                          const isSelected = letter === answer.selectedOption;
                          const optionTone = isCorrect
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : isSelected
                              ? "border-rose-200 bg-rose-50 text-rose-800"
                              : "border-slate-100 bg-slate-50 text-slate-600";
                          return (
                            <div key={letter} className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${optionTone}`}>
                              {isCorrect ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : isSelected ? <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <span className="w-3.5 shrink-0 font-bold">{letter}</span>}
                              <span className="flex-1">{answer.options[letter]}</span>
                              <span className="shrink-0 font-semibold">
                                {isCorrect ? "Correct answer" : isSelected ? "Candidate answer" : ""}
                              </span>
                            </div>
                          );
                        })}
                        {answer.selectedOption === null && (
                          <p className="text-xs font-medium text-slate-400">Candidate left this question unanswered.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
