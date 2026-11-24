import { Suspense, useState } from "react";
import {
  Activity,
  BarChart3,
  ClipboardCheck,
  LogOut,
  Menu,
  Settings2,
  UsersRound,
  X,
} from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AdminApiError, logoutAdmin } from "./admin.api";

const navigation = [
  { label: "Overview", to: "/admin", icon: BarChart3, end: true },
  { label: "Candidates", to: "/admin/candidates", icon: UsersRound, end: false },
  { label: "Question bank", to: "/admin/questions", icon: ClipboardCheck, end: false },
  { label: "Settings", to: "/admin/settings", icon: Settings2, end: false },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const title = location.pathname.startsWith("/admin/candidates")
    ? "Candidate management"
    : location.pathname.startsWith("/admin/questions")
      ? "Question management"
      : location.pathname.startsWith("/admin/settings")
        ? "Assessment settings"
        : "Administrator dashboard";

  async function handleLogout() {
    setLoggingOut(true);
    setLogoutError("");
    try {
      await logoutAdmin();
      navigate("/admin/login", { replace: true });
    } catch (error) {
      setLogoutError(
        error instanceof AdminApiError
          ? error.message
          : "Sign-out couldn't be completed.",
      );
    } finally {
      setLoggingOut(false);
    }
  }

  function navigationLinks(mobile = false) {
    return navigation.map(({ label, to, icon: Icon, end }) => (
      <NavLink
        key={to}
        to={to}
        end={end}
        onClick={() => mobile && setMobileNavOpen(false)}
        className={({ isActive }) =>
          `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
            isActive
              ? "bg-indigo-50 text-indigo-700"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
          }`
        }
      >
        <Icon className="h-[18px] w-[18px]" />
        {label}
      </NavLink>
    ));
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[252px] flex-col border-r border-slate-200 bg-white lg:flex">
        <NavLink to="/admin" className="flex h-[76px] items-center gap-3 border-b border-slate-100 px-6">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <Activity className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-bold tracking-tight text-slate-950">Aptitude</span>
            <span className="block text-[11px] font-medium text-slate-400">ADMIN CONSOLE</span>
          </span>
        </NavLink>
        <div className="px-4 pt-7">
          <p className="px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Workspace
          </p>
          <nav aria-label="Administrator navigation" className="mt-3 space-y-1">
            {navigationLinks()}
          </nav>
        </div>
        <div className="mt-auto border-t border-slate-100 p-4">
          {/* <div className="mb-3 rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-700">Assessment status</p>
            <p className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Live data from MongoDB
            </p>
          </div> */}
          {logoutError && <p role="alert" className="mb-2 text-xs text-rose-600">{logoutError}</p>}
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="cursor-pointer flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
          >
            <LogOut className="h-[18px] w-[18px]" />
            {loggingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </aside>

      <div className="lg:pl-[252px]">
        <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur sm:px-7 lg:px-9">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen((open) => !open)}
              className="cursor-pointer flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 lg:hidden"
              aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
            >
              {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
            <span className="text-sm font-semibold text-slate-800">{title}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs font-medium text-slate-500 sm:block">Assessment administration</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
              AD
            </span>
          </div>
        </header>

        {mobileNavOpen && (
          <nav aria-label="Administrator navigation" className="border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
            {navigationLinks(true)}
            {logoutError && <p role="alert" className="px-3 py-2 text-xs text-rose-600">{logoutError}</p>}
            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={loggingOut}
              className="cursor-pointer flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" />
              {loggingOut ? "Signing out…" : "Sign out"}
            </button>
          </nav>
        )}

        <main className="mx-auto max-w-[1440px] px-4 py-7 sm:px-7 lg:px-9 lg:py-9">
          {logoutError && !mobileNavOpen && (
            <p role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {logoutError}
            </p>
          )}
          <Suspense fallback={<p className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading administrator page…</p>}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
