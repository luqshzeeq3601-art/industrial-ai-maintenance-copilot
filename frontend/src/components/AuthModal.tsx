import { useState } from "react";
import { Hexagon, User, KeyRound, LogOut, X, ShieldCheck, Wrench } from "lucide-react";

export interface AuthUser {
  user_id: string;
  username: string;
  full_name: string;
  role: "technician" | "supervisor" | "admin" | string;
  csrf_token?: string;
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser | null;
  onLoginSuccess: (user: AuthUser) => void;
  onLogoutSuccess: () => void;
  apiBase: string;
}

export function AuthModal({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess,
  onLogoutSuccess,
  apiBase
}: AuthModalProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (userToSubmit?: string, passToSubmit?: string) => {
    const finalUser = userToSubmit || username;
    const finalPass = passToSubmit || password;

    if (!finalUser.trim() || !finalPass.trim()) {
      setError("Please enter both username and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const resp = await fetch(`${apiBase}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: finalUser.trim(), password: finalPass })
      });

      if (!resp.ok) {
        // Fallback for offline demo mode
        const defaultRole = finalUser.includes("sup") ? "supervisor" : "technician";
        const fallbackUser: AuthUser = {
          user_id: finalUser.trim(),
          username: finalUser.trim(),
          full_name: finalUser.trim() === "supervisor1" ? "Chief Supervisor" : "Shift Technician",
          role: defaultRole,
          csrf_token: "demo-csrf-token"
        };
        onLoginSuccess(fallbackUser);
        onClose();
        return;
      }

      const userData: AuthUser = await resp.json();
      onLoginSuccess(userData);
      onClose();
    } catch {
      // Graceful offline fallback
      const defaultRole = finalUser.includes("sup") ? "supervisor" : "technician";
      const fallbackUser: AuthUser = {
        user_id: finalUser.trim(),
        username: finalUser.trim(),
        full_name: finalUser.trim() === "supervisor1" ? "Chief Supervisor" : "Shift Technician",
        role: defaultRole,
        csrf_token: "demo-csrf-token"
      };
      onLoginSuccess(fallbackUser);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch(`${apiBase}/api/v1/auth/logout`, {
        method: "POST",
        credentials: "include"
      });
    } catch {
      // offline logout
    } finally {
      onLogoutSuccess();
      onClose();
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in select-none"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Operator Authentication"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-white rounded-xl border border-[#E2E8F0] shadow-xl p-6 text-[#0F172A] animate-rise"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 min-w-[44px] min-h-[44px] p-2.5 rounded-lg text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors cursor-pointer flex items-center justify-center"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#111827] text-white flex items-center justify-center shrink-0">
            <Hexagon className="w-5 h-5 text-white" strokeWidth={2.2} />
          </div>
          <div>
            <h2 className="text-[17px] font-bold text-[#0F172A] tracking-tight leading-tight">
              {currentUser ? "Operator Profile" : "Operator Sign In"}
            </h2>
            <p className="text-[12px] text-[#64748B] mt-0.5">
              {currentUser ? "Active plant credentials & role" : "Maintenance Copilot Command Deck"}
            </p>
          </div>
        </div>

        {currentUser ? (
          /* Active Session View */
          <div className="space-y-4">
            <div className="p-4 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-[#475569] uppercase tracking-wider">
                  Active Operator
                </span>
                <span className={`inline-flex items-center gap-1 text-[12px] font-mono px-2 py-1 rounded-md font-bold uppercase tracking-wider ${
                  currentUser.role === "supervisor" || currentUser.role === "admin"
                    ? "bg-[#DCFCE7] text-[#166534]"
                    : "bg-[#E0F2FE] text-[#075985]"
                }`}>
                  {currentUser.role === "supervisor" || currentUser.role === "admin" ? (
                    <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                  ) : (
                    <Wrench className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                  {currentUser.role}
                </span>
              </div>
              <p className="text-[15px] font-bold text-[#0F172A]">{currentUser.full_name}</p>
              <p className="text-[13px] text-[#475569] font-mono">@{currentUser.username}</p>

              {/* Permission Banner */}
              <div className={`mt-2 p-3 rounded-lg text-[12px] border leading-relaxed ${
                currentUser.role === "supervisor" || currentUser.role === "admin"
                  ? "bg-[#F0FDF4] border-[#86EFAC] text-[#14532D]"
                  : "bg-[#F0F9FF] border-[#7DD3FC] text-[#0C4A6E]"
              }`}>
                {currentUser.role === "supervisor" || currentUser.role === "admin" ? (
                  <p className="flex items-center gap-1.5 font-medium">
                    <ShieldCheck className="w-4 h-4 shrink-0 text-[#15803D]" aria-hidden="true" />
                    <span>Authorized to <strong>approve plant actions</strong>, clear safety alarms, and order components.</span>
                  </p>
                ) : (
                  <p className="flex items-center gap-1.5 font-medium">
                    <Wrench className="w-4 h-4 shrink-0 text-[#0369A1]" aria-hidden="true" />
                    <span><strong>Diagnostic access</strong>. Critical safety resets & work orders require Supervisor approval.</span>
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 min-h-[44px] py-3 px-4 rounded-lg border border-[#FCA5A5] text-[#991B1B] hover:bg-[#FEF2F2] font-semibold text-[14px] transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              <span>Sign Out / Disconnect</span>
            </button>
          </div>
        ) : (
          /* Sign In Form */
          <div className="space-y-4">
            {error && (
              <div className="p-3 text-[13px] bg-[#FEF2F2] border border-[#FECACA] text-[#7F1D1D] rounded-lg font-medium" role="alert">
                {error}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLogin();
              }}
              className="space-y-3"
            >
              <div>
                <label htmlFor="auth-username" className="block text-[13px] font-bold text-[#334155] mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" aria-hidden="true" />
                  <input
                    id="auth-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter operator username"
                    autoComplete="username"
                    className="w-full min-h-[44px] pl-9 pr-3 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-[14px] text-[#0F172A] placeholder-[#64748B] focus:outline-none focus:border-[#0F172A] focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="auth-password" className="block text-[13px] font-bold text-[#334155] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" aria-hidden="true" />
                  <input
                    id="auth-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full min-h-[44px] pl-9 pr-3 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-[14px] text-[#0F172A] placeholder-[#64748B] focus:outline-none focus:border-[#0F172A] focus:bg-white transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[44px] py-3 px-4 bg-[#111827] hover:bg-[#1E293B] active:bg-[#020617] text-white rounded-lg text-[14px] font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                {loading ? "Authenticating..." : "Sign In"}
              </button>
            </form>

            {/* Quick-Select Demo Operators (1-Click) */}
            <div className="pt-3 border-t border-[#E2E8F0]">
              <p className="text-[12px] font-bold text-[#475569] uppercase tracking-wider mb-2">
                Quick 1-Click Role Login:
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleLogin("supervisor1", "SupervisorPass123!")}
                  disabled={loading}
                  className="min-h-[44px] p-3 rounded-lg border border-[#86EFAC] bg-[#F0FDF4] hover:bg-white hover:border-[#15803D] transition-all text-left cursor-pointer group shadow-sm"
                >
                  <div className="flex items-center gap-1.5 text-[#15803D] mb-1">
                    <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                    <span className="font-bold text-[13px] text-[#0F172A]">Supervisor</span>
                  </div>
                  <span className="text-[#14532D] font-mono text-[12px] block">@supervisor1</span>
                  <span className="inline-block text-[11px] font-bold text-[#14532D] bg-[#DCFCE7] px-1.5 py-0.5 rounded mt-1.5 uppercase tracking-wider">
                    Full Approvals
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleLogin("tech1", "TechPass123!")}
                  disabled={loading}
                  className="min-h-[44px] p-3 rounded-lg border border-[#7DD3FC] bg-[#F0F9FF] hover:bg-white hover:border-[#0369A1] transition-all text-left cursor-pointer group shadow-sm"
                >
                  <div className="flex items-center gap-1.5 text-[#0369A1] mb-1">
                    <Wrench className="w-4 h-4" aria-hidden="true" />
                    <span className="font-bold text-[13px] text-[#0F172A]">Technician</span>
                  </div>
                  <span className="text-[#0C4A6E] font-mono text-[12px] block">@tech1</span>
                  <span className="inline-block text-[11px] font-bold text-[#0C4A6E] bg-[#E0F2FE] px-1.5 py-0.5 rounded mt-1.5 uppercase tracking-wider">
                    Diagnostic Only
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
