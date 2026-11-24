import { useState, type FormEvent } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CircleHelp,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  RegistrationError,
  registerCandidate,
  verifyCandidateEmail,
} from "./candidate.api";
import {
  registrationSchema,
  type RegistrationFormValues,
  type RegistrationValues,
} from "./registration.schema";

const qualificationOptions = [
  "High school",
  "Diploma",
  "Bachelor's degree",
  "Master's degree",
  "Doctorate",
  "Professional qualification",
  "Other",
];

type FormField = keyof RegistrationFormValues;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-sm font-medium text-rose-600">{message}</p>;
}

function RegistrationPage() {
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [verificationRequested, setVerificationRequested] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingRegistration, setPendingRegistration] =
    useState<RegistrationValues | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegistrationFormValues, unknown, RegistrationValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      fullName: "",
      email: "",
      age: undefined,
      phone: "",
      gender: "",
      qualification: "",
      city: "",
    },
    mode: "onBlur",
  });

  const onSubmit = async (values: RegistrationValues) => {
    setSubmitting(true);
    setSubmitError("");
    try {
      await registerCandidate(values);
      setPendingEmail(values.email);
      setPendingRegistration(values);
      setVerificationCode("");
      setVerificationRequested(true);
    } catch (error) {
      if (error instanceof RegistrationError) {
        setSubmitError(error.message);
        if (error.fieldErrors) {
          for (const [field, messages] of Object.entries(error.fieldErrors)) {
            const message = messages?.[0];
            if (message && field in registrationSchema.shape) {
              setError(field as FormField, { type: "server", message });
            }
          }
        }
      } else {
        setSubmitError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const onVerifyEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pendingEmail) return;
    setVerifying(true);
    setSubmitError("");
    try {
      const { candidate } = await verifyCandidateEmail(
        pendingEmail,
        verificationCode,
      );
      navigate(`/assessment/${candidate.id}/instructions`);
    } catch (error) {
      setSubmitError(
        error instanceof RegistrationError
          ? error.message
          : "We couldn't verify your email. Please try again.",
      );
    } finally {
      setVerifying(false);
    }
  };

  const onResendCode = async () => {
    if (!pendingRegistration) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      await registerCandidate(pendingRegistration);
      setVerificationCode("");
    } catch (error) {
      setSubmitError(
        error instanceof RegistrationError
          ? error.message
          : "We couldn't send a new verification code. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";
  const labelClass = "mb-2 block text-sm font-semibold text-slate-800";

  return (
    <main className="min-h-screen bg-[#f4f6fb] px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-7 flex items-center justify-between">
          <a href="/" className="inline-flex items-center gap-3" aria-label="Assessment home">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
              <Building2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-bold tracking-tight text-slate-950">
                Aptitude Assessment
              </span>
              <span className="mt-0.5 block text-xs text-slate-500">
                Candidate portal
              </span>
            </span>
          </a>
          <div className="hidden items-center gap-2 text-sm font-medium text-slate-500 sm:inline-flex">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Secure registration
          </div>
        </header>

        <div className="grid overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_30px_90px_-50px_rgba(15,23,42,0.38)] lg:grid-cols-[0.82fr_1.18fr]">
          <aside className="relative hidden overflow-hidden bg-[#101b3c] px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between xl:px-12">
            <div className="absolute -right-32 -top-20 h-80 w-80 rounded-full border border-white/10" />
            <div className="absolute -right-16 -top-4 h-48 w-48 rounded-full border border-white/10" />
            <div className="absolute -bottom-36 -left-28 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl" />
            <div className="relative">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold tracking-wide text-indigo-100">
                <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                YOUR NEXT CAREER STEP
              </p>
              <h1 className="mt-8 max-w-sm text-4xl font-semibold leading-[1.13] tracking-tight">
                A thoughtful first step toward your next opportunity.
              </h1>
              <p className="mt-5 max-w-sm text-[15px] leading-7 text-indigo-100/75">
                Complete your candidate profile to prepare for the aptitude
                assessment. It only takes a moment.
              </p>
            </div>

            <div className="relative mt-14 space-y-5">
              <div className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-indigo-100">
                  <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold">Your information is protected</p>
                  <p className="mt-1 text-sm leading-6 text-indigo-100/65">
                    Your details are used only for the assessment process.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-indigo-100">
                  <GraduationCap className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold">A smooth assessment experience</p>
                  <p className="mt-1 text-sm leading-6 text-indigo-100/65">
                    Registration details are saved securely for your candidate profile.
                  </p>
                </div>
              </div>
            </div>
            <p className="relative mt-12 text-xs text-indigo-100/45">
              © {new Date().getFullYear()} Aptitude Assessment
            </p>
          </aside>

          <section className="px-5 py-8 sm:px-9 sm:py-10 lg:px-12 lg:py-12">
            <div className="mx-auto max-w-xl">
              <div className="mb-8">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 lg:hidden">
                  <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                  Candidate registration
                </div>
                <p className="text-sm font-semibold text-indigo-600">
                  {verificationRequested ? "EMAIL VERIFICATION" : "CANDIDATE PROFILE"}
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                  {verificationRequested
                    ? "Verify your email"
                    : "Let’s get to know you"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {verificationRequested
                    ? `Enter the 8-digit code sent to ${pendingEmail}. It expires in 15 minutes.`
                    : <>Enter your details below to create your assessment profile.
                      Required fields are marked with <span className="text-rose-600">*</span>.</>}
                </p>
              </div>

              {submitError && (
                <div
                  role="alert"
                  className="mb-6 flex gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm text-rose-800"
                >
                  <CircleHelp className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                  <p>{submitError}</p>
                </div>
              )}

              {!verificationRequested && <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className={labelClass} htmlFor="fullName">
                      Full name <span className="text-rose-600">*</span>
                    </label>
                    <div className="relative">
                      <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" aria-hidden="true" />
                      <input
                        id="fullName"
                        autoComplete="name"
                        placeholder="e.g. Alex Morgan"
                        className={`${inputClass} pl-11`}
                        aria-invalid={Boolean(errors.fullName)}
                        aria-describedby={errors.fullName ? "fullName-error" : undefined}
                        {...register("fullName")}
                      />
                    </div>
                    <div id="fullName-error"><FieldError message={errors.fullName?.message} /></div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className={labelClass} htmlFor="email">
                      Email address <span className="text-rose-600">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" aria-hidden="true" />
                      <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@company.com"
                        className={`${inputClass} pl-11`}
                        aria-invalid={Boolean(errors.email)}
                        aria-describedby={errors.email ? "email-error" : undefined}
                        {...register("email")}
                      />
                    </div>
                    <div id="email-error"><FieldError message={errors.email?.message} /></div>
                  </div>

                  <div>
                    <label className={labelClass} htmlFor="age">
                      Age <span className="text-rose-600">*</span>
                    </label>
                    <input
                      id="age"
                      type="number"
                      min="18"
                      max="60"
                      inputMode="numeric"
                      placeholder="18–60"
                      className={inputClass}
                      aria-invalid={Boolean(errors.age)}
                      aria-describedby={errors.age ? "age-error" : undefined}
                      {...register("age", { valueAsNumber: true })}
                    />
                    <div id="age-error"><FieldError message={errors.age?.message} /></div>
                  </div>

                  <div>
                    <label className={labelClass} htmlFor="phone">
                      Phone number <span className="text-rose-600">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" aria-hidden="true" />
                      <input
                        id="phone"
                        type="tel"
                        autoComplete="tel"
                        inputMode="numeric"
                        maxLength={10}
                        placeholder="10-digit number"
                        className={`${inputClass} pl-11`}
                        aria-invalid={Boolean(errors.phone)}
                        aria-describedby={errors.phone ? "phone-error" : undefined}
                        {...register("phone")}
                      />
                    </div>
                    <div id="phone-error"><FieldError message={errors.phone?.message} /></div>
                  </div>

                  <div>
                    <label className={labelClass} htmlFor="qualification">
                      Highest qualification <span className="text-rose-600">*</span>
                    </label>
                    <select
                      id="qualification"
                      className={`${inputClass} ${errors.qualification ? "text-slate-400" : ""}`}
                      aria-invalid={Boolean(errors.qualification)}
                      aria-describedby={errors.qualification ? "qualification-error" : undefined}
                      {...register("qualification")}
                    >
                      <option value="">Select qualification</option>
                      {qualificationOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                    <div id="qualification-error"><FieldError message={errors.qualification?.message} /></div>
                  </div>

                  <div>
                    <label className={labelClass} htmlFor="gender">Gender <span className="font-normal text-slate-400">(optional)</span></label>
                    <select id="gender" className={inputClass} {...register("gender")}>
                      <option value="">Prefer not to say</option>
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Non-binary">Non-binary</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className={labelClass} htmlFor="city">
                      City <span className="font-normal text-slate-400">(optional)</span>
                    </label>
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" aria-hidden="true" />
                      <input
                        id="city"
                        autoComplete="address-level2"
                        placeholder="Your current city"
                        className={`${inputClass} pl-11`}
                        aria-invalid={Boolean(errors.city)}
                        aria-describedby={errors.city ? "city-error" : undefined}
                        {...register("city")}
                      />
                    </div>
                    <div id="city-error"><FieldError message={errors.city?.message} /></div>
                  </div>
                </div>

                <div className="mt-7 border-t border-slate-100 pt-6">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="h-12 w-full rounded-xl bg-indigo-600 text-[15px] font-semibold shadow-lg shadow-indigo-600/15 hover:bg-indigo-700"
                  >
                    {submitting ? (
                      <>
                        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
                        Sending verification code…
                      </>
                    ) : (
                      <>
                        Continue with email verification
                        <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                      </>
                    )}
                  </Button>
                  <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs leading-5 text-slate-500">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                    Your personal information is handled securely.
                  </p>
                </div>
              </form>
              }
              {verificationRequested && (
                <form onSubmit={onVerifyEmail} noValidate>
                  <label className={labelClass} htmlFor="verificationCode">
                    Verification code
                  </label>
                  <input
                    id="verificationCode"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={8}
                    pattern="[0-9]{8}"
                    value={verificationCode}
                    onChange={(event) =>
                      setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 8))
                    }
                    placeholder="Enter your 8-digit code"
                    className={`${inputClass} text-center text-lg tracking-[0.3em]`}
                    aria-label="8-digit email verification code"
                    required
                  />
                  <div className="mt-7 space-y-3 border-t border-slate-100 pt-6">
                    <Button
                      type="submit"
                      disabled={verifying || verificationCode.length !== 8}
                      className="h-12 w-full rounded-xl bg-indigo-600 text-[15px] font-semibold shadow-lg shadow-indigo-600/15 hover:bg-indigo-700"
                    >
                      {verifying ? "Verifying email…" : "Verify and continue"}
                      {!verifying && <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />}
                    </Button>
                    <div className="flex flex-col items-center justify-between gap-2 text-sm sm:flex-row">
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => {
                          setVerificationRequested(false);
                          setSubmitError("");
                        }}
                        className="cursor-pointer font-medium text-slate-500 hover:text-slate-800"
                      >
                        Change registration details
                      </button>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => void onResendCode()}
                        className="cursor-pointer font-semibold text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                      >
                        {submitting ? "Sending…" : "Resend code"}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </section>
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">
          By registering, you confirm that the information provided is accurate.
        </p>
      </div>
    </main>
  );
}

export default RegistrationPage;
