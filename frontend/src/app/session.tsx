import type { ReactNode } from "react";
import { useSession } from "../hooks/useSession";
import { SessionContext } from "./sessionContext";

export function SessionProvider({ children }: { children: ReactNode }) {
  const session = useSession();
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}
