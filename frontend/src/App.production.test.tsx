import { describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { json, stubFetch } from "./test/fetch";
import { axeViolations } from "./test/axe";
import { SUPERVISOR, TECH, renderApp, stubSignedIn } from "./test/app";

// Production build: no demo data, so an unreachable API must surface as an error
vi.mock("./config", () => ({ API_BASE: "", DEMO_DATA: false }));

const SLOW = { timeout: 8000 };

describe("App without demo data", () => {
  it("shows only the sign-in page to a signed-out user, with nothing of the app behind it", async () => {
    stubSignedIn(null);
    const { container } = await renderApp("/assets");
    expect(await screen.findByRole("heading", { name: "Sign in", level: 1 }, SLOW)).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Primary" })).not.toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("signs in and returns to the page that was asked for", async () => {
    stubSignedIn(null, [[/\/api\/v1\/auth\/login/, json(TECH)]]);
    await renderApp("/sops");
    await userEvent.type(await screen.findByLabelText("Username", undefined, SLOW), "tech1");
    await userEvent.type(screen.getByLabelText("Password"), "TechPass123!");
    stubSignedIn(TECH, [
      [/\/api\/v1\/auth\/login/, json(TECH)],
      [/\/api\/v1\/sops/, json({ count: 0, sops: [] })]
    ]);
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("heading", { name: "SOPs", level: 1 }, SLOW)).toBeInTheDocument();
  });

  it("explains a wrong password without signing in", async () => {
    stubSignedIn(null, [[/\/api\/v1\/auth\/login/, json({ detail: "bad" }, 401)]]);
    await renderApp("/login");
    await userEvent.type(await screen.findByLabelText("Username", undefined, SLOW), "tech1");
    await userEvent.type(screen.getByLabelText("Password"), "wrong-password");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Username or password is incorrect.");
    expect(screen.getByLabelText("Password")).toHaveValue("");
    expect(screen.getByLabelText("Password")).toHaveFocus();
  });

  it("shows the asset error instead of sample assets, and retries", async () => {
    const fetchMock = stubFetch([
      [/\/api\/v1\/auth\/me/, json({ authenticated: true, user: TECH, csrf_token: "t" })],
      [/\/api\/v1\/users\/me/, json({ ...TECH, email: null, department: null, plant: null })]
    ]);
    await renderApp("/assets");
    const alert = await screen.findByRole("alert", undefined, SLOW);
    expect(alert).toHaveTextContent("Assets didn't load");
    expect(screen.queryByText("ApexMill-500")).not.toBeInTheDocument();
    expect(screen.queryByText(/Demo data/)).not.toBeInTheDocument();
    const calls = fetchMock.mock.calls.length;
    await userEvent.click(within(alert).getByRole("button", { name: "Try again" }));
    expect(fetchMock.mock.calls.length).toBeGreaterThan(calls);
  });

  it("requests analytics for the chosen period and compares downtime with the previous one", async () => {
    const health = (days: number) => ({
      total_units: 11,
      uptime_percentage: 72.7,
      total_operating_hours: 100_000,
      total_downtime_hours: 12,
      repairs_logged: 6,
      period_days: days,
      previous_downtime_hours: 8,
      previous_repairs_logged: 6,
      active_work_orders: 3,
      daily_downtime_hours: [],
      status_distribution: { operational: 8, maintenance: 1, fault: 2 }
    });
    const fetchMock = stubSignedIn(TECH, [
      [/fleet-health\?days=30/, json(health(30))],
      [/fleet-health\?days=90/, json(health(90))],
      [/fault-categories/, json({ incident_breakdown: [] })]
    ]);
    const { container } = await renderApp("/");
    expect(await screen.findByText(/vs previous 30 days/, undefined, SLOW)).toBeInTheDocument();
    expect(screen.getByText("72.7%")).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);

    await userEvent.click(screen.getByRole("radio", { name: "90 days" }));
    expect(await screen.findByText(/vs previous 90 days/)).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("fleet-health?days=90"))).toBe(true);
  });

  it("filters assets from the URL and keeps the filter in the status control", async () => {
    stubSignedIn(TECH);
    const { container } = await renderApp("/assets?status=fault");
    const table = (await screen.findAllByRole("table", { name: "Assets" }, SLOW))[0]!;
    await waitFor(() => expect(within(table).getAllByRole("row")).toHaveLength(3)); // header + 2 faulted demo assets
    expect(screen.getByLabelText("Status")).toHaveValue("fault");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("shows the approval tab only to approvers", async () => {
    stubSignedIn(TECH);
    await renderApp("/work-orders");
    await screen.findByRole("heading", { name: "Work orders", level: 1 }, SLOW);
    expect(screen.queryByRole("tab", { name: /Pending approval/ })).not.toBeInTheDocument();
  });

  it("lists the approval tab for a supervisor", async () => {
    stubSignedIn(SUPERVISOR);
    await renderApp("/work-orders");
    expect(await screen.findByRole("tab", { name: /Pending approval/ }, SLOW)).toBeInTheDocument();
  });

  it("validates a new work order before sending it", async () => {
    const fetchMock = stubSignedIn(TECH);
    await renderApp("/work-orders?new=");
    const dialog = await screen.findByRole("dialog", { name: "Create work order" }, SLOW);
    await userEvent.click(within(dialog).getByRole("button", { name: "Create work order" }));
    expect(within(dialog).getByText("Choose the asset this work is for.")).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/Asset/)).toHaveAttribute("aria-invalid", "true");
    expect(fetchMock.mock.calls.some(([, init]) => (init as RequestInit | undefined)?.method === "POST")).toBe(false);
  });

  it("reports an asset that doesn't exist", async () => {
    stubSignedIn(TECH, [[/\/api\/v1\/equipment\/EQ-9999$/, json({ detail: "Equipment 'EQ-9999' not found." }, 404)]]);
    await renderApp("/assets/EQ-9999");
    expect(await screen.findByText("Asset EQ-9999 doesn't exist", undefined, SLOW)).toBeInTheDocument();
  });

  it("lets only admins change a role", async () => {
    stubSignedIn(TECH);
    await renderApp("/settings/profile");
    expect(await screen.findByLabelText("Role", undefined, SLOW)).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  });
});
