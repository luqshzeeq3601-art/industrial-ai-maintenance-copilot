import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { stubFetch } from "./test/fetch";
import { axeViolations } from "./test/axe";

// Development / demo build: sample data may stand in, but it is always labelled
vi.mock("./config", () => ({ API_BASE: "", DEMO_DATA: true }));

const { default: App } = await import("./App");

describe("App with demo data", () => {
  it("labels sample data everywhere it appears", async () => {
    stubFetch([]);
    const { container } = render(<App />);
    expect(await screen.findByRole("heading", { name: "ApexMill-500" })).toBeInTheDocument();
    expect(screen.getByText(/Nothing here reflects the plant/)).toBeInTheDocument();
    const telemetry = screen.getByRole("complementary", { name: /telemetry and actions/ });
    expect(await within(telemetry).findByText("Demo data")).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);

    await userEvent.click(screen.getAllByRole("button", { name: /Dashboard/ })[0]);
    const heading = await screen.findByRole("heading", { name: /Dashboard/ });
    expect(within(heading).getByText("Demo data")).toBeInTheDocument();
  }, 20000);

  it("filters the fleet from the header status bar", async () => {
    stubFetch([]);
    render(<App />);
    await screen.findByRole("heading", { name: "ApexMill-500" });
    const faults = screen.getByRole("button", { name: /Faults/ });
    await userEvent.click(faults);
    expect(faults).toHaveAttribute("aria-pressed", "true");
    const fleet = screen.getByRole("complementary", { name: "Fleet register" });
    expect(within(fleet).getAllByRole("button", { name: /run hours/ })).toHaveLength(2);
  });

  it("opens help from the sidebar", async () => {
    stubFetch([]);
    render(<App />);
    await screen.findByRole("heading", { name: "ApexMill-500" });
    await userEvent.click(screen.getAllByRole("button", { name: "Help and shortcuts" })[0]);
    expect(screen.getByRole("dialog", { name: "Help and shortcuts" })).toBeInTheDocument();
  });
});
