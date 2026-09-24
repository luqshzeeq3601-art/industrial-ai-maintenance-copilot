import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { json, stubFetch } from "./test/fetch";
import { DEMO_EQUIPMENT } from "./defaults";

// Production build: no demo data, so an unreachable API must surface as an error
vi.mock("./config", () => ({ API_BASE: "", DEMO_DATA: false }));

const { default: App } = await import("./App");

describe("App without demo data", () => {
  it("shows the fleet error instead of sample assets, and retries", async () => {
    const fetchMock = stubFetch([]);
    render(<App />);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("The fleet didn't load");
    expect(screen.queryByText("ApexMill-500")).not.toBeInTheDocument();
    expect(screen.queryByText(/Demo data/)).not.toBeInTheDocument();

    const calls = fetchMock.mock.calls.length;
    await userEvent.click(within(alert).getByRole("button", { name: "Try again" }));
    expect(fetchMock.mock.calls.length).toBeGreaterThan(calls);
  });

  it("shows no dashboard figures when analytics fail", async () => {
    stubFetch([[/\/api\/equipment$/, json({ equipment: DEMO_EQUIPMENT })]]);
    render(<App />);
    await screen.findByRole("heading", { name: "ApexMill-500" });
    await userEvent.click(screen.getAllByRole("button", { name: /Dashboard/ })[0]);
    expect(await screen.findByText(/Plant analytics didn't load/)).toBeInTheDocument();
    expect(screen.queryByText("Units running")).not.toBeInTheDocument();
  });

  it("requests analytics for the chosen period and compares with the previous one", async () => {
    const health = (days: number | null) => ({
      total_units: 11,
      total_operating_hours: 100_000,
      avg_operating_hours: 9_000,
      total_downtime_hours: 12,
      repairs_logged: 6,
      period_days: days,
      previous_downtime_hours: days ? 8 : null,
      previous_repairs_logged: days ? 6 : null,
      status_distribution: { operational: 8, maintenance: 1, fault: 2 }
    });
    const faults = { fault_categories: [], severity_distribution: [], incident_breakdown: [] };
    const fetchMock = stubFetch([
      [/\/api\/equipment$/, json({ equipment: DEMO_EQUIPMENT })],
      [/fleet-health\?days=30/, json(health(30))],
      [/fleet-health\?days=90/, json(health(90))],
      [/fault-categories/, json(faults)]
    ]);
    render(<App />);
    await screen.findByRole("heading", { name: "ApexMill-500" });
    await userEvent.click(screen.getAllByRole("button", { name: /Dashboard/ })[0]);
    expect((await screen.findAllByText(/50% vs previous 30 days/)).length).toBe(1);
    expect(screen.getByText("Same as the previous 30 days")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("radio", { name: "90 days" }));
    expect((await screen.findAllByText(/50% vs previous 90 days/)).length).toBe(1);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("fleet-health?days=90"))).toBe(true);
  });

  it("renders live data without a demo label and reports telemetry freshness", async () => {
    const now = new Date().toISOString();
    stubFetch([
      [/\/api\/equipment$/, json({ equipment: DEMO_EQUIPMENT })],
      [/\/history$/, json({ logs: [] })],
      [/telemetry\/events/, json({ events: [{ metric: "spindle_load", value: 42, unit: "%", severity: "low", timestamp: now }] })]
    ]);
    render(<App />);
    expect(await screen.findByRole("heading", { name: "ApexMill-500" })).toBeInTheDocument();
    expect(screen.queryByText(/Demo data/)).not.toBeInTheDocument();
    const telemetry = screen.getByRole("complementary", { name: /telemetry and actions/ });
    expect(await within(telemetry).findByText("Live")).toBeInTheDocument();
    expect(within(telemetry).getByText("Spindle load")).toBeInTheDocument();
    expect(screen.getAllByText("Plant A, Cell 1").length).toBeGreaterThan(0);
    expect(screen.queryByText(/,,/)).not.toBeInTheDocument();
  });

  it("makes the workspace inert while sign-in is open", async () => {
    stubFetch([[/\/api\/equipment$/, json({ equipment: DEMO_EQUIPMENT })]]);
    const { container } = render(<App />);
    await screen.findByRole("heading", { name: "ApexMill-500" });
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(screen.getByRole("dialog", { name: "Sign in" })).toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute("inert");
  });
});
