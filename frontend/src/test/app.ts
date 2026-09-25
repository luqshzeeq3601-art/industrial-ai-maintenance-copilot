import { render } from "@testing-library/react";
import { createElement } from "react";
import { json, stubFetch } from "./fetch";
import { DEMO_EQUIPMENT } from "../defaults";

export const TECH = { user_id: "USR-TEC-01", username: "tech1", full_name: "David Chen", role: "technician" };
export const SUPERVISOR = { user_id: "USR-SUP-01", username: "supervisor1", full_name: "Sarah Jenkins", role: "supervisor" };

type Route = Parameters<typeof stubFetch>[0][number];

/** API stub for a signed-in user; `extra` routes are matched first. Unmatched URLs fail like a down server. */
export function stubSignedIn(user: typeof TECH | null, extra: Route[] = []) {
  return stubFetch([
    ...extra,
    [/\/api\/v1\/auth\/me/, json(user ? { authenticated: true, user, csrf_token: "t" } : { authenticated: false, user: null })],
    [/\/api\/v1\/users\/me/, json(user ? { ...user, email: null, department: null, plant: null } : {}, user ? 200 : 401)],
    [/\/api\/v1\/equipment$/, json({ count: DEMO_EQUIPMENT.length, equipment: DEMO_EQUIPMENT })],
    [/\/api\/v1\/work-orders\?/, json({ count: 0, total: 0, page: 1, page_size: 12, status_counts: {}, work_orders: [] })],
    [/\/api\/v1\/actions\/pending/, json({ count: 0, pending_actions: [] })],
    [/\/api\/v1\/history/, json({ total: 0, page: 1, page_size: 5, users: [], events: [] })]
  ]);
}

/** Render the whole app at `path` (router reads window.location). */
export async function renderApp(path: string) {
  window.history.pushState({}, "", path);
  const { default: App } = await import("../App");
  return render(createElement(App));
}
