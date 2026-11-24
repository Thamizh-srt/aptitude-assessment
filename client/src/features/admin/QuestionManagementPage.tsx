import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Check, Edit3, Plus, Search, Trash2, X } from "lucide-react";
import {
  AdminApiError,
  createAdminQuestion,
  deleteAdminQuestion,
  getAdminQuestions,
  updateAdminQuestion,
  type AdminQuestion,
  type AdminQuestionInput,
  type AdminQuestionList,
} from "./admin.api";

const categories = ["Quantitative", "Logical Reasoning", "Verbal"] as const;
const difficulties = ["Easy", "Medium", "Hard"] as const;
const optionLetters = ["A", "B", "C", "D"] as const;

function blankQuestion(isActive: boolean): AdminQuestionInput {
  return {
    text: "",
    options: { A: "", B: "", C: "", D: "" },
    correctOption: "A",
    category: "Quantitative",
    difficulty: "Medium",
    isActive,
  };
}

export default function QuestionManagementPage() {
  const [data, setData] = useState<AdminQuestionList | null>(null);
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [status, setStatus] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<AdminQuestion | null>(null);
  const [form, setForm] = useState<AdminQuestionInput>(() => blankQuestion(true));
  const [formOpen, setFormOpen] = useState(false);
  const [busyQuestionId, setBusyQuestionId] = useState("");

  const loadQuestions = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      setData(await getAdminQuestions({
        category: category || undefined,
        difficulty: difficulty || undefined,
        status,
        page,
      }));
    } catch (requestError) {
      setError(
        requestError instanceof AdminApiError
          ? requestError.message
          : "Questions couldn't be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [category, difficulty, page, status]);

  useEffect(() => {
    void loadQuestions();
  }, [loadQuestions]);

  function startCreate() {
    setEditing(null);
    setForm(blankQuestion((data?.activeQuestionCount ?? 0) < 10));
    setNotice("");
    setError("");
    setFormOpen(true);
  }

  function startEdit(question: AdminQuestion) {
    setEditing(question);
    setForm({
      text: question.text,
      options: { ...question.options },
      correctOption: question.correctOption,
      category: question.category,
      difficulty: question.difficulty,
      isActive: question.isActive,
    });
    setNotice("");
    setError("");
    setFormOpen(true);
  }

  async function saveQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSaving(true);
    try {
      if (editing) {
        await updateAdminQuestion(editing.id, form);
        setNotice("Question updated. Historical assessments remain unchanged.");
      } else {
        await createAdminQuestion(form);
        setNotice("Question added to the question bank.");
      }
      setEditing(null);
      setFormOpen(false);
      await loadQuestions();
    } catch (requestError) {
      setError(
        requestError instanceof AdminApiError
          ? requestError.message
          : "The question couldn't be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(question: AdminQuestion) {
    setBusyQuestionId(question.id);
    setError("");
    setNotice("");
    try {
      await updateAdminQuestion(question.id, {
        text: question.text,
        options: question.options,
        correctOption: question.correctOption,
        category: question.category,
        difficulty: question.difficulty,
        isActive: !question.isActive,
      });
      setNotice(question.isActive ? "Question deactivated." : "Question activated.");
      await loadQuestions();
    } catch (requestError) {
      setError(
        requestError instanceof AdminApiError
          ? requestError.message
          : "The question status couldn't be changed.",
      );
    } finally {
      setBusyQuestionId("");
    }
  }

  async function removeQuestion(question: AdminQuestion) {
    if (!window.confirm("Delete this question? Saved assessment history will be preserved.")) {
      return;
    }
    setBusyQuestionId(question.id);
    setError("");
    setNotice("");
    try {
      const result = await deleteAdminQuestion(question.id);
      setNotice(
        result.canStartAssessment
          ? "Question deleted. The assessment still has exactly 10 active questions."
          : "Question deleted. Candidates cannot start until exactly 10 questions are active.",
      );
      await loadQuestions();
    } catch (requestError) {
      setError(
        requestError instanceof AdminApiError
          ? requestError.message
          : "The question couldn't be deleted.",
      );
    } finally {
      setBusyQuestionId("");
    }
  }

  function changeFilter(setter: (value: string) => void, value: string) {
    setter(value);
    setPage(1);
  }

  const activeCount = data?.activeQuestionCount ?? 0;
  const totalPages = data?.pagination.totalPages ?? 0;

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Assessment content</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-[30px]">Question bank</h1>
          <p className="mt-2 text-sm text-slate-500">Manage question content, answer keys, and availability.</p>
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="cursor-pointer inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Add question
        </button>
      </div>

      {activeCount !== 10 && (
        <div role="alert" className={`mb-5 rounded-xl border px-4 py-3.5 text-sm ${activeCount > 10 ? "border-rose-200 bg-rose-50 text-rose-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
          <p className="font-semibold">
            {activeCount > 10
              ? `There are ${activeCount} active questions. The limit is 10. Deactivate questions to restore availability.`
              : `Assessment unavailable: exactly 10 active questions are required. Currently active: ${activeCount}.`}
          </p>
          <p className="mt-1 text-xs opacity-80">Candidates can't start a new assessment until the active question count is exactly 10.</p>
        </div>
      )}
      {data?.canStartAssessment && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          <Check className="h-4 w-4" />
          Assessment available — exactly 10 questions are active.
        </div>
      )}

      {notice && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}
      {error && (
        <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <span>{error}</span>
          <button type="button" onClick={() => void loadQuestions()} className="cursor-pointer font-semibold underline underline-offset-2">
            Retry
          </button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="relative min-w-[170px] flex-1">
          <span className="sr-only">Filter by category</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <select
            value={category}
            onChange={(event) => changeFilter(setCategory, event.target.value)}
            className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-indigo-500"
          >
            <option value="">All categories</option>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="min-w-[150px]">
          <span className="sr-only">Filter by difficulty</span>
          <select value={difficulty} onChange={(event) => changeFilter(setDifficulty, event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-indigo-500">
            <option value="">All difficulties</option>
            {difficulties.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="min-w-[145px]">
          <span className="sr-only">Filter by status</span>
          <select value={status} onChange={(event) => { setStatus(event.target.value as typeof status); setPage(1); }} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-indigo-500">
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </label>
        <span className="ml-auto self-center text-xs font-medium text-slate-500">
          {activeCount} / 10 active
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3.5">Question</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">Difficulty</th>
                <th className="px-5 py-3.5">Key</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data?.questions ?? []).map((question) => (
                <tr key={question.id} className="align-top text-sm">
                  <td className="max-w-[420px] px-5 py-4">
                    <p className="line-clamp-2 font-semibold leading-5 text-slate-800">{question.text}</p>
                    <p className="mt-1 text-xs text-slate-400">{Object.keys(question.options).length} options</p>
                  </td>
                  <td className="px-5 py-4 text-slate-600">{question.category}</td>
                  <td className="px-5 py-4 text-slate-600">{question.difficulty}</td>
                  <td className="px-5 py-4">
                    <span className="rounded-md bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700">{question.correctOption}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${question.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                      {question.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button type="button" onClick={() => startEdit(question)} className="cursor-pointer inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                        <Edit3 className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button type="button" disabled={busyQuestionId === question.id} onClick={() => void toggleActive(question)} className="cursor-pointer h-8 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                        {question.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button type="button" disabled={busyQuestionId === question.id} onClick={() => void removeQuestion(question)} aria-label={`Delete question: ${question.text}`} className="cursor-pointer flex h-8 w-8 items-center justify-center rounded-lg border border-rose-100 text-rose-600 hover:bg-rose-50 disabled:opacity-50">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && data?.questions.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-500">No questions match these filters.</td></tr>
              )}
              {loading && (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-500">Loading question bank…</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
          <p className="text-xs text-slate-500">{data?.pagination.total ?? 0} questions · {activeCount} active</p>
          <div className="flex items-center gap-2">
            <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="cursor-pointer h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 disabled:opacity-40">Previous</button>
            <span className="px-2 text-xs font-medium text-slate-500">Page {page} of {Math.max(totalPages, 1)}</span>
            <button type="button" disabled={page >= totalPages || loading} onClick={() => setPage((value) => value + 1)} className="cursor-pointer h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/45 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="question-form-title"
            className="my-auto w-full max-w-2xl rounded-2xl bg-white shadow-2xl"
          >
            <header className="flex items-start justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
              <div>
                <h2 id="question-form-title" className="text-lg font-semibold text-slate-950">
                  {editing ? "Edit question" : "Add question"}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Provide four options and select the single correct answer.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                aria-label="Close question form"
                className="cursor-pointer flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <form onSubmit={(event) => void saveQuestion(event)} className="space-y-5 p-5 sm:p-6">
              {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
              <div>
                <label htmlFor="question-text" className="mb-1.5 block text-sm font-semibold text-slate-700">Question text</label>
                <textarea
                  id="question-text"
                  required
                  minLength={10}
                  maxLength={1000}
                  rows={3}
                  value={form.text}
                  onChange={(event) => setForm((value) => ({ ...value, text: event.target.value }))}
                  className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-3 text-sm leading-6 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                  placeholder="Enter the aptitude question"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {optionLetters.map((letter) => (
                  <label key={letter} className="block">
                    <span className="mb-1.5 flex items-center gap-2 text-xs font-bold text-slate-600">
                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-100">{letter}</span>
                      Option {letter}
                    </span>
                    <input
                      required
                      maxLength={500}
                      value={form.options[letter]}
                      onChange={(event) => setForm((value) => ({
                        ...value,
                        options: { ...value.options, [letter]: event.target.value },
                      }))}
                      className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500"
                    />
                  </label>
                ))}
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-600">Category</span>
                  <select value={form.category} onChange={(event) => setForm((value) => ({ ...value, category: event.target.value as AdminQuestionInput["category"] }))} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500">
                    {categories.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-600">Difficulty</span>
                  <select value={form.difficulty} onChange={(event) => setForm((value) => ({ ...value, difficulty: event.target.value as AdminQuestionInput["difficulty"] }))} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500">
                    {difficulties.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-600">Correct answer</span>
                  <select value={form.correctOption} onChange={(event) => setForm((value) => ({ ...value, correctOption: event.target.value as AdminQuestionInput["correctOption"] }))} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500">
                    {optionLetters.map((letter) => <option key={letter} value={letter}>Option {letter}</option>)}
                  </select>
                </label>
              </div>

              <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-3.5">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => setForm((value) => ({ ...value, isActive: event.target.checked }))}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-700">Active question</span>
                  <span className="mt-0.5 block text-xs leading-5 text-slate-500">The active bank must contain exactly 10 questions for candidates to start.</span>
                </span>
              </label>

              <footer className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setFormOpen(false)} className="cursor-pointer h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={saving} className="cursor-pointer h-10 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
                  {saving ? "Saving…" : editing ? "Save changes" : "Add question"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
