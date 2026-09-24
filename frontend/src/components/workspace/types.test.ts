import { describe, expect, it } from "vitest";
import { citationFile, citationTitle, formatLocation, formatRelative, isOpenWorkOrder, parseTimestamp, splitLocation } from "./types";

describe("splitLocation / formatLocation", () => {
  it("never doubles the separator for 'Plant A, Cell 1'", () => {
    expect(splitLocation("Plant A, Cell 1")).toEqual(["Plant A", "Cell 1"]);
    expect(formatLocation("Plant A, Cell 1")).toBe("Plant A, Cell 1");
  });

  it("adds the separator for 'Plant B Cell 2' and expands 'Cell A-1'", () => {
    expect(formatLocation("Plant B Cell 2")).toBe("Plant B, Cell 2");
    expect(formatLocation("Cell A-1")).toBe("Plant A, Cell 1");
  });

  it("passes other locations through", () => {
    expect(formatLocation("Turning Cell A")).toBe("Turning Cell A");
    expect(formatLocation("Utility Plant")).toBe("Utility Plant");
  });
});

describe("timestamps", () => {
  it("reads the API's naive timestamps as UTC", () => {
    expect(parseTimestamp("2026-09-23 06:58:16")?.toISOString()).toBe("2026-09-23T06:58:16.000Z");
    expect(parseTimestamp("2026-09-23T06:58:16")?.toISOString()).toBe("2026-09-23T06:58:16.000Z");
    expect(parseTimestamp("2026-09-23T06:58:16+08:00")?.toISOString()).toBe("2026-09-22T22:58:16.000Z");
    expect(parseTimestamp("")).toBeNull();
    expect(parseTimestamp("not a date")).toBeNull();
  });

  it("formats relative time", () => {
    const now = Date.parse("2026-09-23T10:00:00Z");
    expect(formatRelative("2026-09-23 08:00:00", now)).toMatch(/2 hours ago/);
    expect(formatRelative("2026-09-20 10:00:00", now)).toMatch(/3 days ago/);
    expect(formatRelative(null, now)).toBe("");
  });
});

describe("citations", () => {
  it("titles markdown sources and only exposes safe file names", () => {
    expect(citationTitle({ source: "sop_spindle_bearing_replacement.md" })).toBe("SOP spindle bearing replacement");
    expect(citationTitle({ document: "OEM manual rev 4" })).toBe("OEM manual rev 4");
    expect(citationFile({ source: "cnc_lathe_manual.md" })).toBe("cnc_lathe_manual.md");
    expect(citationFile({ source: "../secrets.md" })).toBeNull();
    expect(citationFile({ source: "manual.pdf" })).toBeNull();
  });
});

describe("isOpenWorkOrder", () => {
  const log = { id: 1, machine_id: "EQ-1", fault_code: "E-105", fault_description: "", action_taken: "", technician: "", started_at: "2026-04-01 08:00:00", completed_at: "2026-04-01 10:00:00", duration_mins: 120, parts_replaced: "", severity: "high" };
  it("treats a completed E- work order as closed and an uncompleted one as open", () => {
    expect(isOpenWorkOrder(log)).toBe(false);
    expect(isOpenWorkOrder({ ...log, completed_at: "" })).toBe(true);
  });
});
