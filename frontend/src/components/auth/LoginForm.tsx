import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { CircleAlert, Eye, EyeOff, HardHat, Lock, User, UserCog } from "lucide-react";
import { API_BASE } from "../../config";
import { SignInError, signIn, type AuthUser, type SignInErrorKind } from "../../api/auth";
import { cn } from "../../lib/cn";
import { Button } from "../ui/Button";

// Seeded demo accounts are offered only in development or when a build opts in with VITE_DEMO_SIGNIN=true.
// Both flags are replaced at build time, so production bundles don't contain the demo passwords.
const DEMO_ACCOUNTS =
  import.meta.env.DEV || import.meta.env.VITE_DEMO_SIGNIN === "true"
    ? [
        { id: "supervisor1", label: "Supervisor", icon: UserCog, password: "SupervisorPass123!" },
        { id: "tech1", label: "Technician", icon: HardHat, password: "TechPass123!" }
      ]
    : [];

const INPUT =
  "w-full h-11 pl-10 rounded-[var(--radius-control)] border bg-panel text-copy text-ink placeholder:text-subtle " +
  "hover:border-faint focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent";

export function LoginForm({ onSignedIn }: { onSignedIn: (user: AuthUser) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [error, setError] = useState<{ kind: SignInErrorKind | "missing"; message: string } | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const submit = async (source: string, user: string, pass: string) => {
    if (!user.trim() || !pass) {
      setError({ kind: "missing", message: "Enter your username and password." });
      return;
    }
    setError(null);
    setPending(source);
    try {
      onSignedIn(await signIn(API_BASE, user, pass));
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

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submit("form", username, password);
  };

  const trackCapsLock = (e: KeyboardEvent<HTMLInputElement>) => setCapsLock(e.getModifierState?.("CapsLock") ?? false);
  const invalidUser = error?.kind === "credentials" || (error?.kind === "missing" && !username.trim());
  const invalidPass = error?.kind === "credentials" || (error?.kind === "missing" && !password);
  const busy = pending !== null;

  return (
    <div>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {error && (
          <p id="signin-error" role="alert" className="flex items-start gap-2 p-3 rounded-[var(--radius-control)] bg-danger-bg text-meta font-medium text-danger-ink">
            <CircleAlert className="w-4 h-4 mt-px shrink-0 text-danger" aria-hidden="true" />
            {error.message}
          </p>
        )}
        <div className="space-y-1.5">
          <label htmlFor="signin-username" className="block text-meta font-semibold text-ink">
            Username
          </label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle pointer-events-none" aria-hidden="true" />
            <input
              id="signin-username"
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              aria-invalid={invalidUser || undefined}
              aria-describedby={error ? "signin-error" : undefined}
              className={cn(INPUT, "pr-3", invalidUser ? "border-danger" : "border-line-strong")}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="signin-password" className="block text-meta font-semibold text-ink">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle pointer-events-none" aria-hidden="true" />
            <input
              ref={passwordRef}
              id="signin-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyUp={trackCapsLock}
              onKeyDown={trackCapsLock}
              aria-invalid={invalidPass || undefined}
              aria-describedby={[error ? "signin-error" : "", capsLock ? "signin-caps" : ""].filter(Boolean).join(" ") || undefined}
              className={cn(INPUT, "pr-12", invalidPass ? "border-danger" : "border-line-strong")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 rounded-md flex items-center justify-center text-subtle hover:text-ink hover:bg-wash cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
            </button>
          </div>
          {capsLock && (
            <p id="signin-caps" className="text-meta font-medium text-warn">
              Caps Lock is on.
            </p>
          )}
        </div>
        <Button type="submit" variant="primary" className="w-full h-11" loading={pending === "form"} disabled={busy}>
          Sign in
        </Button>
      </form>

      {DEMO_ACCOUNTS.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-3 text-meta text-muted">
            <span className="h-px flex-1 bg-line" aria-hidden="true" />
            Or continue as
            <span className="h-px flex-1 bg-line" aria-hidden="true" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {DEMO_ACCOUNTS.map(({ id, label, icon: Icon, password: pass }) => (
              <button
                key={id}
                type="button"
                disabled={busy}
                onClick={() => void submit(id, id, pass)}
                aria-label={`Continue as ${label} (demo account ${id})`}
                className="flex flex-col items-center justify-center gap-2 h-24 rounded-[var(--radius-card)] border border-line bg-sunken hover:border-accent-line hover:bg-accent-bg text-small font-semibold text-ink cursor-pointer transition-colors disabled:opacity-50"
              >
                <Icon className="w-6 h-6 text-accent" strokeWidth={1.75} aria-hidden="true" />
                {pending === id ? "Signing in…" : label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-label text-muted text-center">Demo accounts, available in development builds only.</p>
        </div>
      )}
    </div>
  );
}
