import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";
import { isApproverRole, signOut, type AuthUser } from "../api/auth";

interface UserMenuProps {
  apiBase: string;
  currentUser: AuthUser | null;
  onSignIn: () => void;
  onSignedOut: () => void;
}

const ROLE_LABEL: Record<string, string> = { supervisor: "Supervisor", admin: "Admin", technician: "Technician" };

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

/** Header account control: a sign-in button when signed out, otherwise a menu with role and sign out. */
export function UserMenu({ apiBase, currentUser, onSignIn, onSignedOut }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!currentUser) {
    return (
      <button
        type="button"
        onClick={onSignIn}
        className="min-h-[40px] pointer-coarse:min-h-[44px] px-3.5 rounded-md border border-line-strong bg-panel text-[14px] font-semibold text-ink hover:bg-sunken transition-colors cursor-pointer"
      >
        Sign in
      </button>
    );
  }

  const approver = isApproverRole(currentUser.role);
  const roleLabel = ROLE_LABEL[currentUser.role] ?? currentUser.role;

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut(apiBase);
    setSigningOut(false);
    setOpen(false);
    onSignedOut();
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls="user-menu"
        aria-label={`Account: ${currentUser.full_name}, ${roleLabel}`}
        className="min-h-[40px] pointer-coarse:min-h-[44px] pl-1 pr-1.5 sm:pr-2 rounded-md hover:bg-wash transition-colors cursor-pointer flex items-center gap-2 text-left"
      >
        <span
          className="w-8 h-8 rounded-full bg-deck text-white text-[12px] font-semibold flex items-center justify-center shrink-0"
          aria-hidden="true"
        >
          {initials(currentUser.full_name)}
        </span>
        <span className="hidden sm:block leading-tight">
          <span className="block text-[13px] font-semibold text-ink whitespace-nowrap">{currentUser.full_name}</span>
          <span className="block text-[12px] text-muted">{roleLabel}</span>
        </span>
        <ChevronDown className={`w-4 h-4 text-subtle transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open && (
        <div
          id="user-menu"
          className="absolute right-0 top-full mt-1.5 z-[var(--z-pop)] w-[272px] bg-panel border border-line rounded-lg shadow-[var(--shadow-tinted-md)] animate-fade-in"
        >
          <div className="px-4 py-3 border-b border-line">
            <p className="text-[14px] font-semibold text-ink">{currentUser.full_name}</p>
            <p className="text-[13px] text-muted">
              {currentUser.username}, {roleLabel}
            </p>
            <p className="mt-2 text-[13px] text-body leading-snug">
              {approver
                ? "You can approve or reject work orders, inspections, and alarm acknowledgments."
                : "Work orders and alarm acknowledgments you request go to a supervisor for approval."}
            </p>
          </div>
          <div className="p-1.5">
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="w-full flex items-center gap-2 min-h-[40px] px-2.5 rounded-md text-[14px] font-medium text-body hover:bg-wash hover:text-ink transition-colors cursor-pointer disabled:opacity-60"
            >
              <LogOut className="w-4 h-4 text-subtle" aria-hidden="true" />
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
