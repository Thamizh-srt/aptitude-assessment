import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  UsersRound,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AdminApiError, getAdminDashboard, type AdminDashboard } from "./admin.api";

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof UsersRound;
  tone: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/30">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
        </div>
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-4 text-xs font-medium text-slate-400">{detail}</p>
    </article>
  );
}

function statusStyle(status: string | null) {
  if (status === "PASS") return "bg-emerald-50 text-emerald-700";
  if (status === "FAIL") return "bg-rose-50 text-rose-700";
  if (status === "IN_PROGRESS") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

function formatDate(value: string | null) {
  if (!value) return "Not submitted";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadDashboard() {
    setError("");
    setLoading(true);
    try {
      setDashboard(await getAdminDashboard());
    } catch (requestError) {
      setError(
        requestError instanceof AdminApiError
          ? requestError.message
          : "Dashboard data couldn't be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  const metrics = dashboard?.metrics;

  return (
    <>
      <section id="overview">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Overview</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-[30px]">
              Assessment performance
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              A live summary of candidate participation and outcomes.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadDashboard()}
            disabled={loading}
            className="cursor-pointer inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 disabled:opacity-50"
          >
            <ArrowUpRight className="h-4 w-4" />
            Refresh data
          </button>
        </div>

        {error && (
          <div role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <span>{error}</span>
            <button type="button" onClick={() => void loadDashboard()} className="cursor-pointer font-semibold underline underline-offset-2">
              Try again
            </button>
          </div>
        )}

        {loading && !dashboard ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
            Loading live dashboard data…
          </div>
        ) : metrics ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <MetricCard label="Total candidates" value={metrics.totalCandidates.toLocaleString()} detail="All registered candidates" icon={UsersRound} tone="bg-indigo-50 text-indigo-600" />
              <MetricCard label="Completed tests" value={metrics.completedTests.toLocaleString()} detail="Submitted assessments" icon={ClipboardCheck} tone="bg-sky-50 text-sky-600" />
              <MetricCard label="Average score" value={`${metrics.averageScore.toFixed(1)} / ${metrics.maxScore}`} detail="Net score across completed tests" icon={BarChart3} tone="bg-violet-50 text-violet-600" />
              <MetricCard label="Pass rate" value={`${metrics.passRate.toFixed(1)}%`} detail="Using each saved submission result" icon={CheckCircle2} tone="bg-emerald-50 text-emerald-600" />
              <MetricCard label="Highest score" value={`${metrics.highestScore} / ${metrics.maxScore}`} detail="Highest submitted net score" icon={ArrowUpRight} tone="bg-amber-50 text-amber-600" />
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
              <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/30 sm:p-6">
                <div className="mb-5">
                  <h2 className="text-base font-semibold text-slate-900">Score distribution</h2>
                  <p className="mt-1 text-xs text-slate-500">Completed assessment scores grouped out of 20.</p>
                </div>
                <div className="flex h-[260px] w-full items-center justify-center">
                  {dashboard.scoreDistribution.some((entry) => entry.count > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dashboard.scoreDistribution} margin={{ top: 8, right: 8, left: -18, bottom: 4 }}>
                        <CartesianGrid stroke="#eef2f7" vertical={false} />
                        <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                        <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                        <Tooltip cursor={{ fill: "#f8fafc" }} />
                        <Bar dataKey="count" name="Candidates" fill="#4f46e5" radius={[6, 6, 0, 0]} maxBarSize={48} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-sm text-slate-400">
                      Scores will appear after the first assessment is submitted.
                    </p>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/30 sm:p-6">
                <div className="mb-3">
                  <h2 className="text-base font-semibold text-slate-900">Pass / Fail</h2>
                  <p className="mt-1 text-xs text-slate-500">Stored outcomes for completed tests.</p>
                </div>
                <div className="flex h-[260px] w-full items-center justify-center">
                  {dashboard.passFail.some((entry) => entry.count > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={dashboard.passFail} dataKey="count" nameKey="name" innerRadius={66} outerRadius={94} paddingAngle={4} stroke="none">
                          {dashboard.passFail.map((entry) => (
                            <Cell key={entry.name} fill={entry.name === "Pass" ? "#10b981" : "#f43f5e"} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={28} iconType="circle" />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-sm text-slate-400">
                      Pass and fail results will appear after submissions.
                    </p>
                  )}
                </div>
              </section>
            </div>
          </>
        ) : null}
      </section>

      <section id="recent-attempts" className="mt-6 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/30">
        <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
          <h2 className="text-base font-semibold text-slate-900">Recent candidate attempts</h2>
          <p className="mt-1 text-xs text-slate-500">Latest assessment activity, including in-progress attempts.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-6 py-3.5">Candidate</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Score</th>
                <th className="px-6 py-3.5">Outcome</th>
                <th className="px-6 py-3.5">Last activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(dashboard?.recentAttempts ?? []).map((attempt) => (
                <tr key={attempt.id} className="text-sm">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-800">{attempt.candidateName}</p>
                    <p className="mt-1 text-xs text-slate-400">{attempt.email || "—"}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusStyle(attempt.status)}`}>
                      {attempt.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-700">
                    {attempt.score === null ? "—" : `${attempt.score} / ${attempt.maxScore ?? 20}`}
                  </td>
                  <td className="px-6 py-4">
                    {attempt.resultStatus ? (
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusStyle(attempt.resultStatus)}`}>
                        {attempt.resultStatus}
                      </span>
                    ) : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">
                    {formatDate(attempt.submittedAt ?? attempt.updatedAt)}
                  </td>
                </tr>
              ))}
              {!loading && dashboard?.recentAttempts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500">
                    No candidate attempts have been recorded yet.
                  </td>
                </tr>
              )}
              {loading && !dashboard && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500">
                    Loading recent attempts…
                  </td>
                </tr>
              )}
              {!loading && !dashboard && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500">
                    Dashboard data is unavailable. Use “Try again” above to reload it.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
