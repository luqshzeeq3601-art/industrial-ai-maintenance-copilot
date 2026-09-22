import { useEffect, useState } from "react";
import { AlertCircle, ArrowLeft, ClipboardCheck, Eye, EyeOff, Loader2, ShieldCheck, Stethoscope, Wrench } from "lucide-react";
import { signIn, type AuthUser } from "../../api/auth";
import { PlantSkyline, ProductMark } from "./SignInArt";

interface SignInPageProps {
  apiBase: string;
  onLoginSuccess: (user: AuthUser) => void;
  onClose: () => void;
}

// Seeded demo accounts are offered only in development or when a build opts in with VITE_DEMO_SIGNIN=true.
// Both flags are replaced at build time, so production bundles don't contain the demo passwords.
const DEMO_ACCOUNTS =
  import.meta.env.DEV || import.meta.env.VITE_DEMO_SIGNIN === "true"
    ? [
        { id: "supervisor1", name: "Supervisor", scope: "Approves work orders", icon: ShieldCheck, password: "SupervisorPass123!" },
        { id: "tech1", name: "Technician", scope: "Runs diagnostics", icon: Wrench, password: "TechPass123!" }
      ]
    : [];

const HIGHLIGHTS = [
  { icon: Stethoscope, text: "Diagnose faults from cited manuals" },
  { icon: ShieldCheck, text: "Follow LOTO and safety SOPs" },
  { icon: ClipboardCheck, text: "Route work orders for approval" }
];

export function SignInPage({ apiBase, onLoginSuccess, onClose }: SignInPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async (source: string, user: string, pass: string) => {
    if (!user.trim() || !pass) {
      setError("Enter your username and password.");
      return;
    }
    setError(null);
    setPending(source);
    try {
      const signedIn = await signIn(apiBase, user, pass);
      onLoginSuccess(signedIn);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed. Try again.");
      setPending(null);
    }
  };

  const busy = pending !== null;
  const fieldClass =
    "w-full h-11 px-3 bg-panel border border-line-strong rounded-md text-[15px] text-ink placeholder:text-subtle transition-colors hover:border-subtle focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 aria-[invalid=true]:border-danger";

  return (
    <div
      className="fixed inset-0 z-[var(--z-overlay)] overflow-y-auto bg-paper"
      role="dialog"
      aria-modal="true"
      aria-labelledby="signin-title"
    >
      <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section
          className="hidden lg:flex relative flex-col overflow-hidden bg-gradient-to-b from-sky-top to-sky-low border-r border-line"
          aria-hidden="true"
        >
          <div className="px-16 pt-14 max-w-[600px]">
            <div className="flex items-center gap-2.5">
              <ProductMark className="w-9 h-9" />
              <p className="text-[16px] font-semibold text-ink">Maintenance Copilot</p>
            </div>
            <p className="mt-14 text-[40px] xl:text-[46px] font-bold leading-[1.06] tracking-[-0.03em] text-ink">
              Keep operations running.
            </p>
            <ul className="mt-8 space-y-3">
              {HIGHLIGHTS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-[15px] text-body">
                  <span className="w-8 h-8 shrink-0 rounded-lg bg-panel/80 border border-line flex items-center justify-center">
                    <Icon className="w-4 h-4 text-accent" aria-hidden="true" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-auto pt-8 h-[34vh] min-h-[240px]">
            <PlantSkyline />
          </div>
        </section>

        <section className="flex flex-col px-4 py-6 sm:px-8">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 lg:invisible">
              <ProductMark className="w-8 h-8" />
              <span className="text-[15px] font-semibold text-ink">Maintenance Copilot</span>
            </span>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-3 -mr-3 rounded-md text-[14px] font-medium text-muted hover:text-ink hover:bg-wash transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              Back to workspace
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center py-8">
          <div className="w-full max-w-[400px]">
            <div className="bg-panel rounded-xl border border-line shadow-[var(--shadow-tinted-md)] p-6 sm:p-8">
            <h1 id="signin-title" className="text-[22px] font-semibold tracking-tight text-ink">
              Sign in
            </h1>
            <p className="mt-1 text-[14px] text-muted">Plant operator account</p>

            <form
              className="mt-6 space-y-4"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                submit("form", username, password);
              }}
            >
              <div>
                <label htmlFor="signin-username" className="block text-[14px] font-medium text-ink mb-1.5">
                  Username
                </label>
                <input
                  id="signin-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  autoFocus
                  aria-invalid={error !== null && !username.trim()}
                  aria-describedby={error ? "signin-error" : undefined}
                  className={fieldClass}
                />
              </div>

              <div>
                <label htmlFor="signin-password" className="block text-[14px] font-medium text-ink mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="signin-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    aria-invalid={error !== null && !password}
                    aria-describedby={error ? "signin-error" : undefined}
                    className={`${fieldClass} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    className="absolute right-0 top-0 w-11 h-11 rounded-md text-subtle hover:text-ink transition-colors cursor-pointer flex items-center justify-center"
                  >
                    {showPassword ? <EyeOff className="w-[18px] h-[18px]" aria-hidden="true" /> : <Eye className="w-[18px] h-[18px]" aria-hidden="true" />}
                  </button>
                </div>
              </div>

              {error && (
                <p id="signin-error" role="alert" className="flex items-start gap-2 text-[14px] text-danger">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full h-11 rounded-md bg-accent hover:bg-accent-hover active:bg-accent-press text-white text-[15px] font-semibold transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {pending === "form" && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                {pending === "form" ? "Signing in…" : "Sign in"}
              </button>
            </form>

            </div>

            {DEMO_ACCOUNTS.length > 0 && (
              <div className="mt-5">
                <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-subtle">Demo accounts</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {DEMO_ACCOUNTS.map(({ id, name, scope, icon: Icon, password }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => submit(id, id, password)}
                      disabled={busy}
                      className="flex items-center gap-2.5 min-h-[52px] px-3 py-2 rounded-lg border border-line bg-panel text-left hover:border-accent-line hover:bg-accent-bg transition-colors cursor-pointer disabled:opacity-60"
                    >
                      <span className="w-8 h-8 shrink-0 rounded-md bg-wash flex items-center justify-center">
                        <Icon className="w-4 h-4 text-accent" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-semibold text-ink">{name}</span>
                        <span className="block text-[12px] text-muted truncate">{scope}</span>
                      </span>
                      {pending === id && <Loader2 className="w-4 h-4 shrink-0 animate-spin text-muted" aria-hidden="true" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          </div>
        </section>
      </div>
    </div>
  );
}
