import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  Clock3,
  Flag,
  LoaderCircle,
  Send,
  ShieldCheck,
} from "lucide-react";
import {
  AssessmentApiError,
  getAssessmentState,
  saveAnswer,
  submitAssessment,
  type AssessmentState,
  type OptionLetter,
  type QuestionAnswer,
} from "./assessment.api";

const optionLetters: OptionLetter[] = ["A", "B", "C", "D"];

function formatTime(milliseconds: number) {
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function TestPage() {
  const { candidateId = "" } = useParams();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState<AssessmentState | null>(null);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitConfirmation, setShowSubmitConfirmation] = useState(false);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const serverResponseReceivedAt = useRef(0);
  const automaticSubmitStarted = useRef(false);

  const applyState = useCallback((next: AssessmentState) => {
    serverResponseReceivedAt.current = performance.now();
    setAssessment(next);
    if (next.status === "SUBMITTED") {
      navigate(`/assessment/${candidateId}/result`, { replace: true });
    } else if (next.status === "NOT_STARTED") {
      navigate(`/assessment/${candidateId}/instructions`, { replace: true });
    }
  }, [candidateId, navigate]);

  const refreshState = useCallback(async () => {
    const next = await getAssessmentState(candidateId);
    applyState(next);
    return next;
  }, [applyState, candidateId]);

  useEffect(() => {
    let active = true;
    getAssessmentState(candidateId)
      .then((next) => {
        if (active) applyState(next);
      })
      .catch((cause) => {
        if (active) {
          setError(
            cause instanceof AssessmentApiError
              ? cause.message
              : "We couldn't restore your assessment.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [applyState, candidateId]);

  useEffect(() => {
    const interval = window.setInterval(() => setTick((value) => value + 1), 250);
    return () => window.clearInterval(interval);
  }, []);

  const remainingMs = useMemo(() => {
    if (assessment?.status !== "IN_PROGRESS") return 0;
    const serverNow = Date.parse(assessment.serverNow);
    const elapsedSinceResponse = Math.max(
      0,
      performance.now() - serverResponseReceivedAt.current,
    );
    return Math.max(
      0,
      Date.parse(assessment.deadlineAt) - serverNow - elapsedSinceResponse,
    );
  }, [assessment, tick]);

  const attemptAutoSubmit = useCallback(async () => {
    if (automaticSubmitStarted.current || saving || submitting) return;
    automaticSubmitStarted.current = true;
    setSubmitting(true);
    setError("");
    try {
      await submitAssessment(candidateId, true);
      navigate(`/assessment/${candidateId}/result`, { replace: true });
    } catch (cause) {
      try {
        const next = await refreshState();
        if (next.status === "SUBMITTED") return;
      } catch {
        setError("Time is up. We are retrying your automatic submission.");
      }
      automaticSubmitStarted.current = false;
      window.setTimeout(() => setTick((value) => value + 1), 1500);
      if (
        cause instanceof AssessmentApiError &&
        cause.code !== "ASSESSMENT_NOT_EXPIRED"
      ) {
        setError("Time is up. We are retrying your automatic submission.");
      }
    } finally {
      setSubmitting(false);
    }
  }, [candidateId, navigate, refreshState, saving, submitting]);

  useEffect(() => {
    if (
      assessment?.status === "IN_PROGRESS" &&
      remainingMs <= 0 &&
      !saving
    ) {
      void attemptAutoSubmit();
    }
  }, [assessment?.status, attemptAutoSubmit, remainingMs, saving]);

  const answers =
    assessment?.status === "IN_PROGRESS" ? assessment.answers : [];
  const currentQuestion = answers[currentPosition];
  const answeredCount = answers.filter((answer) => answer.selectedOption !== null).length;
  const unansweredCount = answers.length - answeredCount;
  const timeLow = remainingMs > 0 && remainingMs <= 60_000;

  const updateAnswer = async (
    question: QuestionAnswer,
    update: { selectedOption?: OptionLetter | null; isMarkedForReview?: boolean },
  ) => {
    if (saving || submitting) return;
    setSaving(true);
    setError("");
    try {
      const next = await saveAnswer(candidateId, question.id, update);
      applyState(next);
    } catch (cause) {
      if (cause instanceof AssessmentApiError && cause.code === "ASSESSMENT_EXPIRED") {
        try {
          await refreshState();
          return;
        } catch {
          setError("Time has expired. We couldn't confirm the final submission yet.");
        }
      } else {
        setError(
          cause instanceof AssessmentApiError
            ? cause.message
            : "Your answer couldn't be saved. Please try again.",
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const submitManually = async () => {
    setSubmitting(true);
    setError("");
    try {
      await submitAssessment(candidateId);
      navigate(`/assessment/${candidateId}/result`, { replace: true });
    } catch (cause) {
      setError(
        cause instanceof AssessmentApiError
          ? cause.message
          : "Your assessment couldn't be submitted. Please try again.",
      );
      try {
        await refreshState();
      } catch {
        // Keep the current screen available so the candidate can retry.
      }
    } finally {
      setSubmitting(false);
      setShowSubmitConfirmation(false);
    }
  };

  if (error && !assessment) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div role="alert" className="max-w-lg rounded-2xl border border-rose-200 bg-white p-7 text-center shadow-sm">
          <AlertCircle className="mx-auto h-8 w-8 text-rose-600" aria-hidden="true" />
          <h1 className="mt-4 text-xl font-semibold text-slate-950">Assessment unavailable</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">{error}</p>
          <button
            type="button"
            className="cursor-pointer mt-5 text-sm font-semibold text-indigo-700 hover:text-indigo-900"
            onClick={() => navigate("/")}
          >
            Return to registration
          </button>
        </div>
      </main>
    );
  }

  if (assessment?.status !== "IN_PROGRESS" || !currentQuestion) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
          <LoaderCircle className="h-5 w-5 animate-spin text-indigo-600" aria-hidden="true" />
          Restoring your assessment…
        </div>
      </main>
    );
  }

  const timer = formatTime(remainingMs);

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950">Aptitude Assessment</p>
              <p className="hidden text-xs text-slate-500 sm:block">Candidate examination</p>
            </div>
          </div>
          <div
            className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 font-mono text-sm font-semibold tabular-nums ${
              timeLow
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-slate-200 bg-white text-slate-800"
            }`}
            aria-live="polite"
            aria-label={`Time remaining ${timer}`}
          >
            <Clock3 className="h-4 w-4" aria-hidden="true" />
            <span>{timer}</span>
            <span className="hidden font-sans text-xs font-medium sm:inline">remaining</span>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 sm:py-7 lg:grid-cols-[minmax(0,1fr)_300px] lg:px-8">
        <section className="min-w-0">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-indigo-700">Aptitude test</p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
                Question {currentPosition + 1} <span className="font-normal text-slate-400">of {answers.length}</span>
              </h1>
            </div>
            <p className="text-sm text-slate-500">
              {answeredCount} of {answers.length} answered
            </p>
          </div>

          <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all"
              style={{ width: `${(answeredCount / answers.length) * 100}%` }}
            />
          </div>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                QUESTION {String(currentPosition + 1).padStart(2, "0")}
              </span>
              {currentQuestion.isMarkedForReview && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                  <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
                  Marked for review
                </span>
              )}
            </div>
            <h2 className="mt-6 max-w-3xl text-lg font-semibold leading-8 text-slate-950 sm:text-xl">
              {currentQuestion.text}
            </h2>

            <div className="mt-7 space-y-3" role="radiogroup" aria-label="Answer options">
              {optionLetters.map((letter) => {
                const selected = currentQuestion.selectedOption === letter;
                return (
                  <button
                    key={letter}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={saving || submitting}
                    onClick={() => void updateAnswer(currentQuestion, { selectedOption: letter })}
                    className={`group cursor-pointer flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition sm:gap-4 sm:p-4 ${
                      selected
                        ? "border-indigo-500 bg-indigo-50/70 ring-2 ring-indigo-500/10"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    } disabled:cursor-wait disabled:opacity-70`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-sm font-semibold ${
                        selected
                          ? "border-indigo-600 bg-indigo-600 text-white"
                          : "border-slate-200 bg-slate-50 text-slate-600 group-hover:border-slate-300"
                      }`}
                    >
                      {letter}
                    </span>
                    <span className="flex-1 pt-1 text-sm leading-6 text-slate-700 sm:text-[15px]">
                      {currentQuestion.options[letter]}
                    </span>
                    {selected && <Check className="mt-1 h-5 w-5 shrink-0 text-indigo-600" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>

            {error && (
              <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                disabled={currentPosition === 0 || saving || submitting}
                onClick={() => setCurrentPosition((position) => Math.max(0, position - 1))}
                className="cursor-pointer inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Previous
              </button>
              <button
                type="button"
                disabled={saving || submitting}
                onClick={() =>
                  void updateAnswer(currentQuestion, {
                    isMarkedForReview: !currentQuestion.isMarkedForReview,
                  })
                }
                className={`cursor-pointer inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition disabled:opacity-50 ${
                  currentQuestion.isMarkedForReview
                    ? "bg-amber-50 text-amber-800 hover:bg-amber-100"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Flag className="h-4 w-4" aria-hidden="true" />
                {currentQuestion.isMarkedForReview ? "Remove review mark" : "Mark for review"}
              </button>
              <button
                type="button"
                disabled={currentPosition === answers.length - 1 || saving || submitting}
                onClick={() =>
                  setCurrentPosition((position) => Math.min(answers.length - 1, position + 1))
                }
                className="cursor-pointer inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </article>
        </section>

        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-[92px]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-950">Question palette</h2>
              <p className="mt-1 text-xs text-slate-500">Select a number to navigate</p>
            </div>
            {saving && <LoaderCircle className="h-4 w-4 animate-spin text-indigo-600" aria-label="Saving answer" />}
          </div>
          <div className="mt-5 grid grid-cols-5 gap-2.5">
            {answers.map((answer, index) => {
              const isCurrent = currentPosition === index;
              const isAnswered = answer.selectedOption !== null;
              const stateLabel = answer.isMarkedForReview
                ? isAnswered ? "answered, marked for review" : "unanswered, marked for review"
                : isAnswered ? "answered" : "unanswered";
              return (
                <button
                  key={answer.id}
                  type="button"
                  aria-label={`Question ${index + 1}, ${stateLabel}`}
                  aria-current={isCurrent ? "step" : undefined}
                  disabled={saving || submitting}
                  onClick={() => setCurrentPosition(index)}
                  className={`relative cursor-pointer flex aspect-square items-center justify-center rounded-xl border text-sm font-semibold transition disabled:cursor-wait ${
                    isCurrent
                      ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                      : answer.isMarkedForReview
                        ? "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100"
                        : isAnswered
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {index + 1}
                  {answer.isMarkedForReview && (
                    <span className={`absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white ${isCurrent ? "bg-amber-300" : "bg-amber-500"}`} />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded border border-emerald-200 bg-emerald-50" />
              Answered
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded border border-slate-200 bg-slate-50" />
              Unanswered
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded border border-amber-200 bg-amber-50" />
              Marked for review
            </div>
          </div>

          <div className="mt-5 rounded-xl bg-slate-50 p-3.5">
            <p className="text-xs leading-5 text-slate-600">
              <strong className="text-slate-800">{unansweredCount}</strong>{" "}
              {unansweredCount === 1 ? "question is" : "questions are"} unanswered.
              Your answers are saved automatically.
            </p>
          </div>

          <button
            type="button"
            disabled={saving || submitting}
            onClick={() => setShowSubmitConfirmation(true)}
            className="cursor-pointer mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            Submit assessment
          </button>
        </aside>
      </div>

      {(saving || submitting) && (
        <div className="fixed bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 shadow-lg">
          {saving ? "Saving your response…" : "Submitting assessment…"}
        </div>
      )}

      {showSubmitConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="submit-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
              <Send className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 id="submit-title" className="mt-4 text-xl font-semibold text-slate-950">
              Submit your assessment?
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {unansweredCount > 0
                ? `You have ${unansweredCount} unanswered ${unansweredCount === 1 ? "question" : "questions"}. `
                : "You have answered all questions. "}
              Once submitted, your responses cannot be changed.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowSubmitConfirmation(false)}
                disabled={submitting}
                className="cursor-pointer h-10 rounded-lg px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              >
                Continue test
              </button>
              <button
                type="button"
                onClick={() => void submitManually()}
                disabled={submitting}
                className="cursor-pointer inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
                Confirm submission
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default TestPage;
