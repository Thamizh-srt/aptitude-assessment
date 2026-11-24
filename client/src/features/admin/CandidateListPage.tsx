import { useEffect, useState } from "react";
import { Download, Search, SlidersHorizontal } from "lucide-react";
import { Link } from "react-router-dom";
import {
  AdminApiError,
  downloadCandidateCsv,
  getAdminCandidates,
  type AdminCandidateList,
  type CandidateFilters,
} from "./admin.api";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function resultBadge(result: string | null) {
  if (result === "PASS") return "bg-emerald-50 text-emerald-700";
  if (result === "FAIL") return "bg-rose-50 text-rose-700";
  return "bg-slate-100 text-slate-600";
}

export default function CandidateListPage() {
  const [data, setData] = useState<AdminCandidateList | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [resultStatus, setResultStatus] = useState<"ALL" | "PASS" | "FAIL">("ALL");
  const [sortBy, setSortBy] = useState<"date" | "score">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<"all" | "filtered" | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let active = true;
    setError("");
    setLoading(true);
    getAdminCandidates({ search, resultStatus, sortBy, sortOrder, page })
      .then((response) => {
        if (active) setData(response);
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(
            requestError instanceof AdminApiError
              ? requestError.message
              : "Candidate records couldn't be loaded.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, resultStatus, search, sortBy, sortOrder]);

  async function exportResults(scope: "all" | "filtered") {
    setExporting(scope);
    setError("");
    try {
      const filters: CandidateFilters = scope === "all"
        ? {}
        : { search, resultStatus, sortBy, sortOrder };
      await downloadCandidateCsv(filters);
    } catch (requestError) {
      setError(
        requestError instanceof AdminApiError
          ? requestError.message
          : "The CSV export couldn't be generated.",
      );
    } finally {
      setExporting(null);
    }
  }

  const pagination = data?.pagination;

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">People</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-[30px]">Candidates</h1>
          <p className="mt-2 text-sm text-slate-500">Search registrations and review saved assessment outcomes.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={exporting !== null} onClick={() => void exportResults("all")} className="cursor-pointer inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-600 shadow-sm hover:border-slate-300 disabled:opacity-50">
            <Download className="h-4 w-4" />
            {exporting === "all" ? "Exporting…" : "Export all results"}
          </button>
          <button type="button" disabled={exporting !== null} onClick={() => void exportResults("filtered")} className="cursor-pointer inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-3.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50">
            <Download className="h-4 w-4" />
            {exporting === "filtered" ? "Exporting…" : "Export filtered"}
          </button>
        </div>
      </div>

      {error && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}

      <div className="mb-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[minmax(220px,1fr)_170px_170px_150px]">
        <label className="relative">
          <span className="sr-only">Search name or email</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search name or email" className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" />
        </label>
        <label>
          <span className="sr-only">Filter by result</span>
          <select value={resultStatus} onChange={(event) => { setResultStatus(event.target.value as typeof resultStatus); setPage(1); }} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-indigo-500">
            <option value="ALL">All results</option>
            <option value="PASS">Pass</option>
            <option value="FAIL">Fail</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Sort candidates by</span>
          <select value={sortBy} onChange={(event) => { setSortBy(event.target.value as typeof sortBy); setPage(1); }} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-indigo-500">
            <option value="date">Attempt date</option>
            <option value="score">Score</option>
          </select>
        </label>
        <label className="relative">
          <span className="sr-only">Sort direction</span>
          <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <select value={sortOrder} onChange={(event) => { setSortOrder(event.target.value as typeof sortOrder); setPage(1); }} className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-indigo-500">
            <option value="desc">{sortBy === "score" ? "Highest first" : "Newest first"}</option>
            <option value="asc">{sortBy === "score" ? "Lowest first" : "Oldest first"}</option>
          </select>
        </label>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3.5">Candidate</th>
                <th className="px-5 py-3.5">Phone</th>
                <th className="px-5 py-3.5">Age</th>
                <th className="px-5 py-3.5">Score</th>
                <th className="px-5 py-3.5">Percentage</th>
                <th className="px-5 py-3.5">Result</th>
                <th className="px-5 py-3.5">Attempt date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data?.candidates ?? []).map((candidate) => (
                <tr key={candidate.id} className="text-sm hover:bg-slate-50/60">
                  <td className="px-5 py-4">
                    <Link to={`/admin/candidates/${encodeURIComponent(candidate.id)}`} className="font-semibold text-indigo-700 hover:text-indigo-900 hover:underline">
                      {candidate.fullName}
                    </Link>
                    <p className="mt-1 text-xs text-slate-400">{candidate.email}</p>
                  </td>
                  <td className="px-5 py-4 text-slate-600">{candidate.phone}</td>
                  <td className="px-5 py-4 text-slate-600">{candidate.age}</td>
                  <td className="px-5 py-4 font-semibold text-slate-700">
                    {candidate.score === null ? "—" : `${candidate.score} / ${candidate.maxScore ?? 20}`}
                  </td>
                  <td className="px-5 py-4 text-slate-600">{candidate.percentage === null ? "—" : `${candidate.percentage}%`}</td>
                  <td className="px-5 py-4">
                    {candidate.resultStatus
                      ? <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${resultBadge(candidate.resultStatus)}`}>{candidate.resultStatus}</span>
                      : <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${resultBadge(null)}`}>{candidate.attemptStatus.replace("_", " ")}</span>}
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-500">{formatDate(candidate.attemptDate)}</td>
                </tr>
              ))}
              {!loading && data?.candidates.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-14 text-center text-sm text-slate-500">No candidates match these filters.</td></tr>
              )}
              {loading && (
                <tr><td colSpan={7} className="px-5 py-14 text-center text-sm text-slate-500">Loading candidate records…</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
          <p className="text-xs text-slate-500">
            {pagination?.total ?? 0} candidates · {pagination?.pageSize ?? 10} per page
          </p>
          <div className="flex items-center gap-2">
            <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="cursor-pointer h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 disabled:opacity-40">Previous</button>
            <span className="px-2 text-xs font-medium text-slate-500">Page {page} of {Math.max(pagination?.totalPages ?? 0, 1)}</span>
            <button type="button" disabled={page >= (pagination?.totalPages ?? 0) || loading} onClick={() => setPage((value) => value + 1)} className="cursor-pointer h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>
    </section>
  );
}
