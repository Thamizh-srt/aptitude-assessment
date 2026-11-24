import { useEffect, useState, type FormEvent } from "react";
import { Clock3, Save, Target } from "lucide-react";
import {
  AdminApiError,
  getAdminAssessmentSettings,
  updateAdminAssessmentSettings,
} from "./admin.api";

type SettingsForm = {
  durationMinutes: string;
  passPercentage: string;
};

const fieldClass =
  "mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";

export default function AssessmentSettingsPage() {
  const [form, setForm] = useState<SettingsForm>({
    durationMinutes: "15",
    passPercentage: "60",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    getAdminAssessmentSettings()
      .then((settings) => {
        if (active) {
          setForm({
            durationMinutes: String(settings.durationMinutes),
            passPercentage: String(settings.passPercentage),
          });
          setLoaded(true);
        }
      })
      .catch((requestError: unknown) => {
        if (active) {
          setLoadError(
            requestError instanceof AdminApiError
              ? requestError.message
              : "Assessment settings couldn't be loaded.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const durationMinutes = Number(form.durationMinutes);
    const passPercentage = Number(form.passPercentage);
    if (
      form.durationMinutes.trim() === "" ||
      !Number.isInteger(durationMinutes) ||
      durationMinutes < 1 ||
      durationMinutes > 180
    ) {
      setError("Enter a whole-number duration from 1 to 180 minutes.");
      return;
    }
    if (
      form.passPercentage.trim() === "" ||
      !Number.isFinite(passPercentage) ||
      passPercentage < 0 ||
      passPercentage > 100
    ) {
      setError("Enter a passing percentage from 0 to 100.");
      return;
    }

    setSaving(true);
    try {
      const settings = await updateAdminAssessmentSettings({
        durationMinutes,
        passPercentage,
      });
      setForm({
        durationMinutes: String(settings.durationMinutes),
        passPercentage: String(settings.passPercentage),
      });
      setNotice("Assessment settings saved.");
    } catch (requestError) {
      setError(
        requestError instanceof AdminApiError
          ? requestError.message
          : "Assessment settings couldn't be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">
          Assessment configuration
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-[30px]">
          Assessment settings
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Set the time limit and passing threshold for your aptitude assessment.
        </p>
      </div>

      {error && (
        <div role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {notice}
        </div>
      )}

      <form
        onSubmit={saveSettings}
        className="max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
      >
        {loading ? (
          <p className="py-10 text-center text-sm text-slate-500">
            Loading saved assessment settings…
          </p>
        ) : !loaded ? (
          <div className="py-5 text-center">
            <p role="alert" className="text-sm text-rose-700">
              {loadError || "Assessment settings couldn't be loaded."}
            </p>
            <button
              type="button"
              onClick={() => setReloadKey((key) => key + 1)}
              className="cursor-pointer mt-3 text-sm font-semibold text-indigo-700 underline underline-offset-2"
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <Clock3 className="h-4 w-4 text-indigo-600" />
                  Test duration
                </span>
                <span className="mt-1 block text-xs text-slate-500">
                  Whole minutes, from 1 to 180.
                </span>
                <input
                  type="number"
                  min={1}
                  max={180}
                  step={1}
                  required
                  value={form.durationMinutes}
                  onChange={(event) => setForm((current) => ({
                    ...current,
                    durationMinutes: event.target.value,
                  }))}
                  className={fieldClass}
                  aria-label="Test duration in minutes"
                />
              </label>

              <label className="block">
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <Target className="h-4 w-4 text-indigo-600" />
                  Passing percentage
                </span>
                <span className="mt-1 block text-xs text-slate-500">
                  From 0% to 100%; decimal thresholds are allowed.
                </span>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    required
                    value={form.passPercentage}
                    onChange={(event) => setForm((current) => ({
                      ...current,
                      passPercentage: event.target.value,
                    }))}
                    className={`${fieldClass} pr-10`}
                    aria-label="Passing percentage"
                  />
                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                    %
                  </span>
                </div>
              </label>
            </div>

            <div className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50/70 px-4 py-3.5 text-sm leading-6 text-indigo-950">
              Duration is saved when a candidate starts. The passing threshold
              is saved when they submit; completed results are never recalculated
              when these settings change.
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
              <p className="text-xs leading-5 text-slate-500">
                Settings are stored in the database and apply to future starts
                and submissions.
              </p>
              <button
                type="submit"
                disabled={saving || loading}
                className="cursor-pointer inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving…" : "Save settings"}
              </button>
            </div>
          </>
        )}
      </form>
    </section>
  );
}
