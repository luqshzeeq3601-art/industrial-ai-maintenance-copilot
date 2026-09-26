import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Activity, AlertCircle, ArrowLeft, BookOpen, ClipboardList, Eye, EyeOff, LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
import { SignInError, signIn, type AuthUser, type SignInErrorKind } from "../../api/auth";
import { ProductMark } from "./SignInArt";

interface SignInPageProps {
  apiBase: string;
  sessionExpired?: boolean;
  onLoginSuccess: (user: AuthUser) => void;
  onClose: () => void;
}

const DEMO_ACCOUNTS = import.meta.env.DEV || import.meta.env.VITE_DEMO_SIGNIN === "true" ? [
  { id: "supervisor1", label: "Supervisor", password: "SupervisorPass123!" },
  { id: "tech1", label: "Technician", password: "TechPass123!" }
] : [];

export function SignInPage({ apiBase, sessionExpired = false, onLoginSuccess, onClose }: SignInPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [error, setError] = useState<{ kind: SignInErrorKind | "missing"; message: string } | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

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
    } catch (cause) {
      const kind = cause instanceof SignInError ? cause.kind : "server";
      setError({ kind, message: cause instanceof Error ? cause.message : "Sign-in failed. Try again." });
      setPending(null);
      if (kind === "credentials" && source === "form") {
        setPassword("");
        passwordRef.current?.focus();
      }
    }
  };
  const trackCapsLock = (event: KeyboardEvent<HTMLInputElement>) => setCapsLock(event.getModifierState?.("CapsLock") ?? false);
  const badCredentials = error?.kind === "credentials";
  const busy = pending !== null;

  return <div className="fixed inset-0 z-[var(--z-overlay)] overflow-y-auto bg-paper" role="dialog" aria-modal="true" aria-labelledby="signin-title">
    <div className="mx-auto flex min-h-dvh w-full max-w-[1740px] flex-col px-4 py-4 sm:px-6 sm:py-6">
      <div className="relative grid flex-1 overflow-hidden rounded-2xl border border-line bg-panel shadow-[var(--shadow-tinted-md)] lg:grid-cols-[minmax(0,1.55fr)_minmax(420px,0.85fr)]">
        <section className="relative min-h-[270px] overflow-hidden bg-sky-50 p-6 sm:p-10 lg:min-h-0 lg:p-14">
          <img src="/plant-bg.jpg" alt="Industrial plant equipment" className="absolute inset-0 h-full w-full object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/90 to-white/10 lg:via-white/70" aria-hidden="true" />
          <div className="relative z-10 flex h-full flex-col">
            <div className="flex items-center gap-3"><ProductMark className="h-9 w-9" /><span className="text-title font-bold text-ink">Maintenance Copilot</span></div>
            <div className="mt-12 max-w-[580px] lg:mt-auto lg:mb-10">
              <h2 className="max-w-[15ch] text-[clamp(30px,3vw,44px)] font-bold leading-[1.12] tracking-tight text-ink">Smarter maintenance for reliable operations</h2>
              <p className="mt-4 max-w-[42ch] text-title leading-6 text-body">Monitor assets, diagnose issues, and manage maintenance from one workspace.</p>
              <ul className="mt-7 grid gap-3 text-small font-medium text-body sm:grid-cols-2 lg:grid-cols-1">
                {[[Activity, "Real-time asset monitoring"], [ShieldCheck, "AI-assisted diagnostics"], [ClipboardList, "Work order management"], [BookOpen, "Maintenance procedures"]].map(([Icon, label]) => {
                  const ItemIcon = Icon as typeof Activity;
                  return <li key={label as string} className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-white"><ItemIcon className="h-4 w-4" aria-hidden="true" /></span>{label as string}</li>;
                })}
              </ul>
            </div>
          </div>
        </section>
        <main className="flex flex-col justify-center bg-panel px-6 py-8 sm:px-10 lg:px-12">
          <button type="button" onClick={onClose} className="mb-10 inline-flex min-h-11 items-center gap-2 self-start text-small font-medium text-muted hover:text-accent"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to workspace</button>
          <div className="mx-auto w-full max-w-[440px]"><div className="flex items-center gap-3"><ProductMark className="h-9 w-9" /><span className="text-title font-bold text-ink">Maintenance Copilot</span></div>
            <h1 id="signin-title" className="mt-8 text-[32px] font-bold leading-9 text-ink">Sign in</h1><p className="mt-2 text-small text-muted">Access your account</p>
            {sessionExpired && <p role="status" className="mt-5 rounded-lg border border-warn-line bg-warn-bg p-3 text-small text-warn-ink">Your session expired. Sign in again to continue.</p>}
            <form className="mt-7 space-y-4" noValidate onSubmit={(event) => { event.preventDefault(); void submit("form", username, password); }}>
              <div><label htmlFor="signin-username" className="mb-1.5 block text-small font-semibold text-body">Username</label><div className="relative">
                <UserRound className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-subtle" aria-hidden="true" />
                <input id="signin-username" type="text" autoFocus autoComplete="username" autoCapitalize="none" spellCheck={false} value={username} onChange={(event) => setUsername(event.target.value)}
                  aria-invalid={badCredentials || (error?.kind === "missing" && !username.trim())} aria-describedby={error ? "signin-error" : undefined}
                  className="h-12 w-full rounded-lg border border-line-strong bg-panel pl-10 pr-4 text-small text-ink placeholder:text-subtle hover:border-accent-line focus:border-accent focus:outline-2 focus:outline-accent" placeholder="Enter your username" /></div></div>
              <div><label htmlFor="signin-password" className="mb-1.5 block text-small font-semibold text-body">Password</label><div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-subtle" aria-hidden="true" />
                <input ref={passwordRef} id="signin-password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)}
                  onKeyDown={trackCapsLock} onKeyUp={trackCapsLock} onBlur={() => setCapsLock(false)}
                  aria-invalid={badCredentials || (error?.kind === "missing" && !password)} aria-describedby={[error ? "signin-error" : "", capsLock ? "signin-caps" : ""].filter(Boolean).join(" ") || undefined}
                  className="h-12 w-full rounded-lg border border-line-strong bg-panel pl-10 pr-12 text-small text-ink placeholder:text-subtle hover:border-accent-line focus:border-accent focus:outline-2 focus:outline-accent" placeholder="Enter your password" />
                <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)} className="absolute right-0 top-0 grid h-12 w-12 place-items-center text-muted hover:text-ink">
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></div></div>
              {capsLock && <p id="signin-caps" className="text-small text-warn">Caps Lock is on.</p>}
              {error && <p id="signin-error" role="alert" className="flex gap-2 rounded-lg border border-danger-line bg-danger-bg p-3 text-small text-danger-ink"><AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />{error.message}</p>}
              <button type="submit" disabled={busy} className="min-h-12 w-full rounded-lg bg-accent px-4 text-small font-semibold text-white hover:bg-accent-hover disabled:opacity-60">{pending === "form" ? "Signing in…" : "Sign in"}</button>
            </form>
            {DEMO_ACCOUNTS.length > 0 && <div className="mt-7 border-t border-line pt-5"><p className="text-center text-meta text-muted">Development shortcuts</p><div className="mt-3 grid grid-cols-2 gap-3">
              {DEMO_ACCOUNTS.map((account) => <button type="button" key={account.id} disabled={busy} onClick={() => void submit(account.id, account.id, account.password)}
                className="min-h-20 rounded-lg border border-line-strong bg-sunken p-3 text-left text-small font-semibold text-ink hover:border-accent-line hover:bg-accent-bg disabled:opacity-60">
                <UserRound className="mb-2 h-5 w-5 text-accent" aria-hidden="true" />{pending === account.id ? "Signing in…" : account.label}</button>)}
            </div></div>}
            <p className="mt-6 text-meta text-muted">Need access? Contact your plant administrator.</p>
          </div>
        </main>
      </div>
    </div>
  </div>;
}
