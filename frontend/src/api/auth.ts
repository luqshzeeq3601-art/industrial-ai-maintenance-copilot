export interface AuthUser {
  user_id: string;
  username: string;
  full_name: string;
  role: "technician" | "supervisor" | "admin" | string;
  csrf_token?: string;
}

export const isApproverRole = (role?: string) => role === "supervisor" || role === "admin";

/** Signs in against the API. Throws with a user-facing message; never invents a session. */
export async function signIn(apiBase: string, username: string, password: string): Promise<AuthUser> {
  let resp: Response;
  try {
    resp = await fetch(`${apiBase}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username: username.trim(), password })
    });
  } catch {
    throw new Error("Can't reach the sign-in service. Check your connection and try again.");
  }
  // 422: the API rejects malformed credentials (e.g. too short) before checking them
  if (resp.status === 401 || resp.status === 403 || resp.status === 422) {
    throw new Error("Username or password is incorrect.");
  }
  if (resp.status === 429) {
    throw new Error("Too many sign-in attempts. Wait a minute and try again.");
  }
  if (!resp.ok) {
    throw new Error(`Sign-in failed (status ${resp.status}). Try again.`);
  }
  return (await resp.json()) as AuthUser;
}

export async function signOut(apiBase: string): Promise<void> {
  await fetch(`${apiBase}/api/v1/auth/logout`, { method: "POST", credentials: "include" }).catch(() => {});
}
