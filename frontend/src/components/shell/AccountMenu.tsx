import { useState } from "react";
import { useNavigate } from "react-router";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, LogOut, UserRound } from "lucide-react";
import { API_BASE } from "../../config";
import { signOut, type AuthUser } from "../../api/auth";
import { initials } from "../../lib/format";
import { ROLE_LABEL } from "../../lib/status";

const ITEM =
  "flex items-center gap-2.5 h-10 px-2.5 rounded-md text-small text-ink outline-none cursor-pointer data-[highlighted]:bg-wash data-[disabled]:opacity-50";

/** Header account control: avatar, name, role; menu with profile and sign out. */
export function AccountMenu({ user, onSignedOut }: { user: AuthUser; onSignedOut: () => void }) {
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const role = ROLE_LABEL[user.role] ?? user.role;

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut(API_BASE);
    onSignedOut();
    navigate("/login", { replace: true });
  };

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`Account: ${user.full_name}, ${role}`}
          className="flex items-center gap-2.5 h-11 pl-1 pr-2 rounded-[var(--radius-control)] hover:bg-wash data-[state=open]:bg-wash cursor-pointer text-left"
        >
          <span className="w-9 h-9 rounded-full bg-deck text-white text-meta font-semibold flex items-center justify-center shrink-0" aria-hidden="true">
            {initials(user.full_name)}
          </span>
          <span className="hidden md:block leading-tight">
            <span className="block text-small font-semibold text-ink whitespace-nowrap">{user.full_name}</span>
            <span className="block text-label text-body">{role}</span>
          </span>
          <ChevronDown className="w-4 h-4 text-subtle" aria-hidden="true" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-[var(--z-pop)] w-64 p-1 bg-panel border border-line rounded-[var(--radius-control)] shadow-[var(--shadow-overlay)]"
        >
          <div className="px-2.5 py-2 mb-1 border-b border-line">
            <p className="text-small font-semibold text-ink">{user.full_name}</p>
            <p className="text-meta text-body">
              <span className="font-data">{user.username}</span> · {role}
            </p>
          </div>
          <DropdownMenu.Item className={ITEM} onSelect={() => navigate("/settings/profile")}>
            <UserRound className="w-4 h-4 text-body" aria-hidden="true" />
            Profile settings
          </DropdownMenu.Item>
          <DropdownMenu.Item className={ITEM} disabled={signingOut} onSelect={() => void handleSignOut()}>
            <LogOut className="w-4 h-4 text-body" aria-hidden="true" />
            {signingOut ? "Signing out…" : "Sign out"}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
