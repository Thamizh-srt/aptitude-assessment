import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Minus,
  ShieldCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AssessmentApiError,
  getInstructions,
  startAssessment,
  type Instructions,
} from "./assessment.api";

function InstructionsPage() {
  const { candidateId = "" } = useParams();
  const navigate = useNavigate();
  const [instructions, setInstructions] = useState<Instructions | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getInstructions(candidateId)
      .then((response) => {
        if (!active) return;
        if (response.status === "SUBMITTED") {
          navigate(`/assessment/${candidateId}/result`, { replace: true });
          return;
        }
        setInstructions(response);
      })
      .catch((cause) => {
        if (!active) return;
        setError(
          cause instanceof AssessmentApiError
            ? cause.message
            : "We couldn't load the assessment instructions.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [candidateId, navigate]);

  const begin = async () => {
    setStarting(true);
    setError("");
    try {
      const state = await startAssessment(candidateId);
      if (state.status === "SUBMITTED") {
        navigate(`/assessment/${candidateId}/result`, { replace: true });
      } else {
        navigate(`/assessment/${candidateId}/test`);
      }
    } catch (cause) {
      setError(
        cause instanceof AssessmentApiError
          ? cause.message
          : "The assessment couldn't be started. Please try again.",
      );
    } finally {
      setStarting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:py-12">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="font-semibold text-slate-950">Aptitude Assessment</p>
              <p className="text-xs text-slate-500">Candidate portal</p>
            </div>
          </div>
          <span className="hidden text-sm text-slate-500 sm:block">Before you begin</span>
        </header>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-7 sm:px-10 sm:py-9">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-indigo-600">
              Assessment instructions
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              A few things to know before you start
            </h1>
            <p className="mt-3 max-w-2xl leading-7 text-slate-600">
              Please read these details carefully. Your assessment is timed and
              your answers are saved as you go.
            </p>
          </div>

          <div className="grid gap-8 px-6 py-7 sm:px-10 sm:py-9 md:grid-cols-[1fr_260px]">
            <section aria-labelledby="rules-heading">
              <h2 id="rules-heading" className="text-base font-semibold text-slate-950">
                Test format
              </h2>
              <ul className="mt-5 space-y-4">
                <li className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-700">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <p className="text-sm leading-6 text-slate-600">
                    The assessment contains <strong className="text-slate-900">exactly 10 multiple-choice questions</strong>,
                    with four options for each question.
                  </p>
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-700">
                    <Clock3 className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <p className="text-sm leading-6 text-slate-600">
                    You will have{" "}
                    <strong className="text-slate-900">
                      {instructions?.durationMinutes ?? 15} minutes
                    </strong>
                    . The timer starts when you begin and continues if you refresh
                    or reopen the page.
                  </p>
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <p className="text-sm leading-6 text-slate-600">
                    Each correct answer earns{" "}
                    <strong className="text-slate-900">+2 marks</strong>.
                  </p>
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-700">
                    <X className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <p className="text-sm leading-6 text-slate-600">
                    Each incorrect answer deducts{" "}
                    <strong className="text-slate-900">1 mark</strong>.
                  </p>
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                    <Minus className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <p className="text-sm leading-6 text-slate-600">
                    Unanswered questions receive{" "}
                    <strong className="text-slate-900">0 marks</strong>. You can
                    move between questions and mark items to review.
                  </p>
                </li>
              </ul>
            </section>

            <aside className="h-fit rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Your assessment
              </p>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Questions</span>
                  <span className="font-semibold text-slate-900">10</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Time limit</span>
                  <span className="font-semibold text-slate-900">
                    {instructions?.durationMinutes ?? 15} minutes
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-sm">
                  <span className="text-slate-600">Maximum score</span>
                  <span className="font-semibold text-slate-900">20 marks</span>
                </div>
              </div>
              <div className="mt-5 rounded-xl border border-indigo-100 bg-white p-3.5">
                <p className="text-xs leading-5 text-slate-600">
                  Your progress is automatically saved. You can safely refresh
                  and return to your active test.
                </p>
              </div>
            </aside>
          </div>

          <div className="border-t border-slate-100 bg-slate-50/70 px-6 py-5 sm:px-10">
            {error && (
              <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}
            {instructions && !instructions.available && (
              <div role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {instructions.message}
              </div>
            )}
            {loading ? (
              <div className="h-11 animate-pulse rounded-xl bg-slate-200" />
            ) : (
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Back to registration
                </button>
                <Button
                  type="button"
                  disabled={!instructions?.available || starting}
                  onClick={begin}
                  className="h-11 rounded-xl px-5 font-semibold"
                >
                  {starting
                    ? "Preparing assessment…"
                    : instructions?.status === "IN_PROGRESS"
                      ? "Resume assessment"
                      : "Start assessment"}
                  {!starting && <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />}
                </Button>
              </div>
            )}
          </div>
        </div>
        <p className="mt-5 text-center text-xs text-slate-400">
          For the best experience, ensure you have a stable connection before starting.
        </p>
      </div>
    </main>
  );
}

export default InstructionsPage;
