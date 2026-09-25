import { useEffect } from "react";
import { Navigate, useLocation, useNavigate, type Location } from "react-router";
import { Activity, ClipboardList, Clock, ShieldCheck, Stethoscope } from "lucide-react";
import { useSessionContext } from "../app/sessionContext";
import { ProductMark } from "../components/auth/SignInArt";
import { LoginForm } from "../components/auth/LoginForm";
import { PlantIllustration } from "../components/auth/PlantIllustration";

const BENEFITS = [
  { icon: Activity, label: "Real-time asset monitoring" },
  { icon: Stethoscope, label: "AI-assisted diagnostics" },
  { icon: ClipboardList, label: "Work order management" },
  { icon: ShieldCheck, label: "Safer operations" }
];

/** Standalone sign-in: product value on the left, the form on the right. Nothing of the app shows behind it. */
export function LoginPage() {
  const session = useSessionContext();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location } | null)?.from;
  const target = from ? `${from.pathname}${from.search}` : "/";

  useEffect(() => {
    document.title = "Sign in · Maintenance Copilot";
  }, []);

  if (session.currentUser) return <Navigate to={target} replace />;

  return (
    <div className="min-h-dvh bg-paper flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-[1280px] grid lg:grid-cols-[minmax(0,1fr)_460px] bg-panel border border-line rounded-[var(--radius-card)] overflow-hidden">
        <section aria-labelledby="login-pitch" className="relative flex flex-col gap-8 p-8 md:p-12 bg-sunken lg:border-r border-b lg:border-b-0 border-line overflow-hidden">
          <div className="flex items-center gap-3">
            <ProductMark className="w-9 h-9" />
            <span className="text-title font-semibold">Maintenance Copilot</span>
          </div>
          <div className="relative z-10 max-w-[520px]">
            <h2 id="login-pitch" className="text-[32px] leading-[38px] md:text-hero font-bold tracking-[-0.025em] text-ink">
              Smarter maintenance for reliable operations
            </h2>
            <p className="mt-4 text-title text-body">Monitor assets, diagnose faults, and keep work orders moving.</p>
            <ul className="mt-8 space-y-4">
              {BENEFITS.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-3.5 text-copy font-medium text-ink">
                  <span className="w-10 h-10 rounded-[var(--radius-control)] bg-accent-solid text-white flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          </div>
          <PlantIllustration className="hidden md:block w-full max-w-[560px] mt-auto self-end" />
        </section>

        <section aria-labelledby="signin-title" className="flex flex-col justify-center p-8 md:p-12">
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <ProductMark className="w-8 h-8" />
            <span className="text-title font-semibold">Maintenance Copilot</span>
          </div>
          <h1 id="signin-title" className="text-page-title font-bold tracking-[-0.02em]">
            Sign in
          </h1>
          <p className="mt-1 mb-6 text-copy text-body">Use your plant operator account.</p>
          {session.expired && (
            <p role="status" className="mb-4 flex items-start gap-2 p-3 rounded-[var(--radius-control)] bg-warn-bg text-meta font-medium text-warn-ink">
              <Clock className="w-4 h-4 mt-px shrink-0 text-warn" aria-hidden="true" />
              Your session expired. Sign in again to continue where you left off.
            </p>
          )}
          <LoginForm
            onSignedIn={(user) => {
              session.signedIn(user);
              navigate(target, { replace: true });
            }}
          />
        </section>
      </div>
    </div>
  );
}
