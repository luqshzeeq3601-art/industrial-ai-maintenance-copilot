import { useState } from "react";
import { User, Shield, KeyRound, LogOut, X, CheckCircle2 } from "lucide-react";

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
  apiBase,
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
        body: JSON.stringify({ username: finalUser.trim(), password: finalPass }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.detail || `Authentication failed (status ${resp.status})`);
      }

      const userData: AuthUser = await resp.json();
      onLoginSuccess(userData);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to authenticate.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch(`${apiBase}/api/v1/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      onLogoutSuccess();
      onClose();
    } catch (err: any) {
      console.error("Logout error:", err);
      onLogoutSuccess();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-md rounded-lg border border-[#EAEAEA] bg-[#FFFFFF] shadow-2xl p-6 text-[#111111] animate-in fade-in zoom-in-95 duration-150">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-md text-[#787774] hover:text-[#111111] hover:bg-[#F4F4F2] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-md bg-[#111111] text-white">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold tracking-tight">Plant Access & RBAC</h2>
            <p className="text-xs text-[#787774]">
              Role-Based Access Control for Human-in-the-Loop Operations
            </p>
          </div>
        </div>

        {currentUser ? (
          <div className="space-y-4">
            <div className="p-4 rounded-md border border-[#EAEAEA] bg-[#FBFBFA] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#787774]">Active Operator</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-[#EDF3EC] text-[#346538] border border-[#346538]/20 font-medium capitalize">
                  <CheckCircle2 className="w-3 h-3" />
                  {currentUser.role}
                </span>
              </div>
              <p className="text-sm font-semibold">{currentUser.full_name}</p>
              <p className="text-xs text-[#787774] font-mono">@{currentUser.username}</p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleLogout}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-md border border-[#9F2F2D]/30 text-[#9F2F2D] hover:bg-[#FDEBEC] font-medium text-xs transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Disconnect / Log Out</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <div className="p-3 text-xs bg-[#FDEBEC] border border-[#9F2F2D]/20 text-[#9F2F2D] rounded-md font-medium">
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
                <label className="block text-xs font-medium text-[#787774] mb-1">
                  Operator Username
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 absolute left-3 top-3 text-[#787774]" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. supervisor1"
                    className="w-full pl-9 pr-3 py-2 bg-[#FBFBFA] border border-[#EAEAEA] rounded-md text-xs text-[#111111] focus:outline-none focus:border-[#111111] focus:bg-[#FFFFFF]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#787774] mb-1">
                  Password
                </label>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 absolute left-3 top-3 text-[#787774]" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 bg-[#FBFBFA] border border-[#EAEAEA] rounded-md text-xs text-[#111111] focus:outline-none focus:border-[#111111] focus:bg-[#FFFFFF]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-[#111111] hover:bg-[#262626] text-white rounded-md text-xs font-medium transition-all shadow-[0_1px_2px_rgba(0,0,0,0.1)] disabled:opacity-50"
              >
                {loading ? "Authenticating..." : "Sign In"}
              </button>
            </form>

            <div className="pt-3 border-t border-[#EAEAEA]">
              <p className="text-[11px] text-[#787774] mb-2 font-medium">
                Quick-Select Test Operators:
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleLogin("supervisor1", "SupervisorPass123!")}
                  disabled={loading}
                  className="p-2.5 rounded-md border border-[#EAEAEA] bg-[#FBFBFA] hover:bg-[#F4F4F2] hover:border-[#111111] transition-all text-left text-[11px]"
                >
                  <span className="font-semibold block text-[#111111]">supervisor1</span>
                  <span className="text-[#346538] font-mono text-[10px]">Role: Supervisor</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleLogin("tech1", "TechPass123!")}
                  disabled={loading}
                  className="p-2.5 rounded-md border border-[#EAEAEA] bg-[#FBFBFA] hover:bg-[#F4F4F2] hover:border-[#111111] transition-all text-left text-[11px]"
                >
                  <span className="font-semibold block text-[#111111]">tech1</span>
                  <span className="text-[#1F6C9F] font-mono text-[10px]">Role: Technician</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
