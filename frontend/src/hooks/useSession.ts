import { useCallback, useEffect, useState } from "react";
import { API_BASE } from "../config";
import { isApproverRole, notifySessionExpired, onSessionExpired, type AuthUser } from "../api/auth";

const APPROVALS_POLL_MS = 60_000;

/**
 * Signed-in user, their approval queue size, and session expiry. A 401 on any authenticated call
 * clears the user and leaves `expired` set so the sign-in page can explain why it appeared.
 */
export function useSession() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [expired, setExpired] = useState(false);
  /** False until the initial /auth/me check settles, so guards don't flash the sign-in page. */
  const [checked, setChecked] = useState(false);
  const isApprover = isApproverRole(currentUser?.role);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE}/api/v1/auth/me`, { credentials: "include", signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.authenticated && data.user) setCurrentUser({ ...data.user, csrf_token: data.csrf_token });
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setChecked(true);
      });
    return () => controller.abort();
  }, []);

  useEffect(
    () =>
      onSessionExpired(() => {
        setCurrentUser((user) => {
          if (user) setExpired(true);
          return null;
        });
        setPendingApprovals(0);
      }),
    []
  );

  // Approvers see how many requests wait for them; others never see the queue
  useEffect(() => {
    if (!isApprover) return;
    const controller = new AbortController();
    const poll = () =>
      fetch(`${API_BASE}/api/v1/actions/pending`, { credentials: "include", signal: controller.signal })
        .then((res) => {
          if (res.status === 401) notifySessionExpired();
          return res.ok ? res.json() : null;
        })
        .then((data) => {
          if (data) setPendingApprovals(data.count ?? 0);
        })
        .catch(() => {});
    poll();
    const timer = window.setInterval(poll, APPROVALS_POLL_MS);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [isApprover]);

  const signedIn = useCallback((user: AuthUser) => {
    setCurrentUser(user);
    setExpired(false);
  }, []);

  const signedOut = useCallback(() => {
    setCurrentUser(null);
    setPendingApprovals(0);
    setExpired(false);
  }, []);

  const dismissExpired = useCallback(() => setExpired(false), []);

  return { currentUser, checked, isApprover, pendingApprovals, setPendingApprovals, expired, signedIn, signedOut, dismissExpired };
}
