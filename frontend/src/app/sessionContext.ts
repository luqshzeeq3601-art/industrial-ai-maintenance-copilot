import { createContext, useContext } from "react";
import type { useSession } from "../hooks/useSession";

export type Session = ReturnType<typeof useSession>;

export const SessionContext = createContext<Session | null>(null);

/** Signed-in user, approval queue size, and session expiry, shared by the shell and pages. */
export function useSessionContext(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSessionContext must be used inside SessionProvider");
  return session;
}

/** The signed-in user; pages behind AuthGuard can rely on it. */
export function useCurrentUser() {
  const { currentUser } = useSessionContext();
  if (!currentUser) throw new Error("useCurrentUser requires a signed-in user");
  return currentUser;
}
