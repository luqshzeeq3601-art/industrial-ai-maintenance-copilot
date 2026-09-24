import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Clock,
  Eye,
  EyeOff,
  Info,
  Loader2,
  Lock,
  User,
  Users,
  Wrench
} from "lucide-react";
import { SignInError, signIn, type AuthUser, type SignInErrorKind } from "../../api/auth";
import { ProductMark } from "./SignInArt";

interface SignInPageProps {
  apiBase: string;
  /** The previous session ended on its own (401); say so above the form. */
  sessionExpired?: boolean;
  onLoginSuccess: (user: AuthUser) => void;
  onClose: () => void;
}

// Seeded demo accounts are offered only in development or when a build opts in with VITE_DEMO_SIGNIN=true.
// Both flags are replaced at build time, so production bundles don't contain the demo passwords.
const DEMO_ACCOUNTS =
  import.meta.env.DEV || import.meta.env.VITE_DEMO_SIGNIN === "true"
    ? [
        { id: "supervisor1", name: "Supervisor", scope: "Approves work orders", password: "SupervisorPass123!" },
        { id: "tech1", name: "Technician", scope: "Runs diagnostics", password: "TechPass123!" }
      ]
    : [];

export function SignInPage({ apiBase, sessionExpired = false, onLoginSuccess, onClose }: SignInPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [error, setError] = useState<{ kind: SignInErrorKind | "missing"; message: string } | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Return focus to whatever opened the page. Escape does not close it: a stray key shouldn't discard typed credentials.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    return () => opener?.focus?.();
  }, []);

  const submit = async (source: string, user: string, pass: string) => {
    if (!user.trim() || !pass) {
      setError({ kind: "missing", message: "Enter your username and password." });
      return;
    }
    setError(null);
    setPending(source);
    try {
      const signedIn = await signIn(apiBase, user, pass);
      onLoginSuccess(signedIn);
      onClose();
    } catch (err) {
      const kind = err instanceof SignInError ? err.kind : "server";
      setError({ kind, message: err instanceof Error ? err.message : "Sign-in failed. Try again." });
      setPending(null);
      if (kind === "credentials" && source === "form") {
        setPassword("");
        passwordRef.current?.focus();
      }
    }
  };

  const trackCapsLock = (e: KeyboardEvent<HTMLInputElement>) => setCapsLock(e.getModifierState?.("CapsLock") ?? false);
  const badCredentials = error?.kind === "credentials";
  const busy = pending !== null;

  return (
    <div
      className="fixed inset-0 z-[var(--z-overlay)] overflow-y-auto bg-slate-900"
      role="dialog"
      aria-modal="true"
      aria-labelledby="signin-title"
    >
      {/* Background layer: Photographic plant backdrop with atmospheric depth */}
      <div className="fixed inset-0 pointer-events-none select-none overflow-hidden" aria-hidden="true">
        <img
          src="/plant-bg.jpg"
          alt=""
          className="w-full h-full object-cover object-center scale-[1.03] filter blur-[1.5px] opacity-90"
        />

        {/* Ambient daylight gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-sky-50/75 via-slate-100/80 to-slate-200/90" />
      </div>

      {/* Interactive foreground layout */}
      <div className="relative min-h-dvh flex flex-col justify-between z-10">
        {/* Top Header Bar */}
        <header className="h-[68px] shrink-0 flex items-center justify-between gap-4 px-5 sm:px-8 border-b border-slate-200/60 bg-white/70 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <ProductMark className="w-8 h-8 drop-shadow-xs" />
            <span className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Maintenance Copilot
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-slate-300/80 bg-white/80 backdrop-blur-sm text-sm font-medium text-slate-700 hover:text-slate-950 hover:bg-white hover:border-slate-400 shadow-xs hover:shadow-sm transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" aria-hidden="true" />
            Back to workspace
          </button>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-14">
          <div className="w-full max-w-[420px] mx-auto">
            {/* Center Sign-in Card */}
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl border border-white/80 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.12),0_1px_3px_rgba(15,23,42,0.04)] p-7 sm:p-9 transition-all">
              <h1 id="signin-title" className="text-2xl sm:text-[28px] font-bold tracking-tight text-slate-900">
                Sign in
              </h1>
              <p className="mt-1.5 text-sm text-slate-600">
                Use your plant operator account.
              </p>

              {sessionExpired && (
                <div
                  role="status"
                  className="mt-4 flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs font-medium text-amber-900"
                >
                  <Clock className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
                  <span>Your session expired. Sign in again to continue where you left off.</span>
                </div>
              )}

              <form
                className="mt-6 space-y-4"
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  submit("form", username, password);
                }}
              >
                {/* Username Input */}
                <div>
                  <label htmlFor="signin-username" className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                    Username
                  </label>
                  <div className="relative group">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                      <User className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <input
                      id="signin-username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your username"
                      autoComplete="username"
                      autoCapitalize="none"
                      spellCheck={false}
                      autoFocus
                      aria-invalid={badCredentials || (error?.kind === "missing" && !username.trim())}
                      aria-describedby={error ? "signin-error" : undefined}
                      className="w-full h-11 pl-10 pr-3.5 bg-slate-50/70 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 hover:border-slate-400 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 focus:bg-white transition-all aria-[invalid=true]:border-red-500 aria-[invalid=true]:ring-red-500/10"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <label htmlFor="signin-password" className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                    Password
                  </label>
                  <div className="relative group">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                      <Lock className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <input
                      ref={passwordRef}
                      id="signin-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      onKeyDown={trackCapsLock}
                      onKeyUp={trackCapsLock}
                      onBlur={() => setCapsLock(false)}
                      aria-invalid={badCredentials || (error?.kind === "missing" && !password)}
                      aria-describedby={[error ? "signin-error" : "", capsLock ? "signin-caps" : ""].filter(Boolean).join(" ") || undefined}
                      className="w-full h-11 pl-10 pr-11 bg-slate-50/70 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 hover:border-slate-400 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 focus:bg-white transition-all aria-[invalid=true]:border-red-500 aria-[invalid=true]:ring-red-500/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-pressed={showPassword}
                      className="absolute right-0 top-0 w-11 h-11 rounded-r-xl text-slate-400 hover:text-slate-700 transition-colors cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:text-blue-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                    </button>
                  </div>
                </div>

                {capsLock && (
                  <p id="signin-caps" className="-mt-1 text-xs font-medium text-amber-600 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                    Caps Lock is on.
                  </p>
                )}

                {error && (
                  <p id="signin-error" role="alert" className="flex items-start gap-2 text-xs font-medium text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                    <span>{error.message}</span>
                  </p>
                )}

                {/* Primary Sign-in Button */}
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full h-11 sm:h-12 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-semibold transition-all shadow-sm hover:shadow hover:shadow-blue-600/20 active:scale-[0.985] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                >
                  {pending === "form" ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      <span>Signing in…</span>
                    </>
                  ) : (
                    <>
                      <span>Sign in</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </>
                  )}
                </button>
              </form>

              {/* Administrative Notice */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-start gap-2 text-xs text-slate-500 leading-relaxed">
                <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
                <p>Forgot your password or need an account? Your plant administrator manages access and can reset it.</p>
              </div>
            </div>

            {/* Demo Accounts Section (Underneath Card) */}
            {DEMO_ACCOUNTS.length > 0 && (
              <div className="mt-6 w-full">
                <p className="text-xs font-semibold text-slate-600 mb-2 px-1 text-center sm:text-left">
                  Demo accounts (development only)
                </p>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {DEMO_ACCOUNTS.map(({ id, name, scope, password }) => {
                    const isSupervisor = id.includes("supervisor");
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => submit(id, id, password)}
                        disabled={busy}
                        className="flex items-center gap-3 p-3 rounded-xl border border-slate-200/90 bg-white/90 backdrop-blur-md text-left hover:border-blue-400/80 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-60 group"
                      >
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                            isSupervisor
                              ? "bg-blue-50 border-blue-100 text-blue-600 group-hover:bg-blue-100"
                              : "bg-emerald-50 border-emerald-100 text-emerald-600 group-hover:bg-emerald-100"
                          }`}
                          aria-hidden="true"
                        >
                          {isSupervisor ? (
                            <Users className="w-4 h-4" />
                          ) : (
                            <Wrench className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-slate-900">
                            {name}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {scope}
                          </div>
                        </div>
                        {pending === id ? (
                          <Loader2 className="w-4 h-4 shrink-0 animate-spin text-slate-400" aria-hidden="true" />
                        ) : (
                          <ChevronRight
                            className={`w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5 ${
                              isSupervisor
                                ? "text-slate-300 group-hover:text-blue-600"
                                : "text-slate-300 group-hover:text-emerald-600"
                            }`}
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
