import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FleetRegisterPanel } from "./FleetRegisterPanel";
import { DEMO_EQUIPMENT } from "../../defaults";
import { axeViolations } from "../../test/axe";

function renderPanel(props: Partial<Parameters<typeof FleetRegisterPanel>[0]> = {}) {
  const onSelect = vi.fn();
  const onSearchChange = vi.fn();
  const onStatusFilterChange = vi.fn();
  const utils = render(
    <FleetRegisterPanel
      equipment={DEMO_EQUIPMENT}
      selectedId="EQ-1000"
      onSelect={onSelect}
      searchFilter=""
      onSearchChange={onSearchChange}
      statusFilter={null}
      onStatusFilterChange={onStatusFilterChange}
      {...props}
    />
  );
  return { ...utils, onSelect, onSearchChange, onStatusFilterChange };
}

describe("FleetRegisterPanel", () => {
  it("has no axe violations", async () => {
    const { container } = renderPanel();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("lists faults first, marks the selected asset, and selects on click", async () => {
    const { onSelect } = renderPanel();
    const rows = screen.getAllByRole("button", { name: /run hours/ });
    expect(rows[0]).toHaveAccessibleName(/ApexMill-500, EQ-1000, Plant A, Cell 1, Fault/);
    expect(rows[0]).toHaveAttribute("aria-current", "true");
    await userEvent.click(screen.getByRole("button", { name: /RoboArm-X2/ }));
    expect(onSelect).toHaveBeenCalledWith("EQ-1001");
  });

  it("moves focus between rows with the arrow keys", async () => {
    renderPanel();
    const rows = screen.getAllByRole("button", { name: /run hours/ });
    rows[0].focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(rows[1]).toHaveFocus();
    await userEvent.keyboard("{End}");
    expect(rows[rows.length - 1]).toHaveFocus();
  });

  it("explains an empty status filter and clears it", async () => {
    const { onStatusFilterChange } = renderPanel({ equipment: DEMO_EQUIPMENT.filter((e) => e.status !== "maintenance"), statusFilter: "maintenance" });
    expect(screen.getByRole("status")).toHaveTextContent("No assets are in maintenance right now.");
    await userEvent.click(screen.getByRole("button", { name: "Clear filter" }));
    expect(onStatusFilterChange).toHaveBeenCalledWith(null);
  });

  it("focuses search with the / shortcut", async () => {
    renderPanel();
    await userEvent.keyboard("/");
    expect(screen.getByRole("searchbox")).toHaveFocus();
  });
});
