import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { json, stubFetch } from "./test/fetch";
import { axeViolations } from "./test/axe";
import { TECH, renderApp } from "./test/app";

// Development / demo build: sample assets may stand in for an unreachable API, but are always labelled
vi.mock("./config", () => ({ API_BASE: "", DEMO_DATA: true }));

describe("App with demo data", () => {
  it("labels sample assets when the API is unreachable", async () => {
    stubFetch([
      [/\/api\/v1\/auth\/me/, json({ authenticated: true, user: TECH, csrf_token: "t" })],
      [/\/api\/v1\/users\/me/, json({ ...TECH, email: null, department: null, plant: null })]
    ]);
    const { container } = await renderApp("/assets");
    expect((await screen.findAllByText("ApexMill-500", undefined, { timeout: 8000 })).length).toBeGreaterThan(0);
    expect(screen.getByText(/Nothing here reflects the plant/)).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });
});
