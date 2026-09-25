import { vi } from "vitest";

type Route = [pattern: RegExp, respond: () => Response | Promise<Response>];

/** fetch stub that answers by URL pattern; unmatched URLs fail like an unreachable server. */
export function stubFetch(routes: Route[]) {
  const mock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const route = routes.find(([pattern]) => pattern.test(url));
    if (!route) throw new TypeError("Failed to fetch");
    return route[1]();
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

export const json = (body: unknown, status = 200) => () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
