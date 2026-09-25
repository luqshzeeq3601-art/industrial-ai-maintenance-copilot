import { afterEach, describe, expect, it, vi } from "vitest";
import { formatHours, humanize, initials, isOverdue, isoDay, parseApiTime } from "./format";

describe("parseApiTime", () => {
  it("reads the API's naive timestamps as UTC", () => {
    expect(parseApiTime("2026-09-23 06:58:16")?.toISOString()).toBe("2026-09-23T06:58:16.000Z");
    expect(parseApiTime("2026-09-23T06:58:16")?.toISOString()).toBe("2026-09-23T06:58:16.000Z");
    expect(parseApiTime("2026-09-23T06:58:16+08:00")?.toISOString()).toBe("2026-09-22T22:58:16.000Z");
    expect(parseApiTime("2026-09-23T06:58:16.123Z")?.toISOString()).toBe("2026-09-23T06:58:16.123Z");
  });

  it("returns null for empty or invalid values", () => {
    expect(parseApiTime("")).toBeNull();
    expect(parseApiTime(null)).toBeNull();
    expect(parseApiTime("not a date")).toBeNull();
  });
});

describe("isOverdue", () => {
  afterEach(() => vi.useRealTimers());

  it("is overdue only before today", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 25, 12));
    expect(isoDay(0)).toBe("2026-09-25");
    expect(isOverdue("2026-09-24")).toBe(true);
    expect(isOverdue("2026-09-25")).toBe(false);
    expect(isOverdue(null)).toBe(false);
  });
});

describe("formatting", () => {
  it("formats hours with grouping and a unit", () => {
    expect(formatHours(12153)).toBe("12,153 h");
    expect(formatHours(null)).toBe("—");
  });

  it("builds initials and sentence-case labels", () => {
    expect(initials("David  Chen")).toBe("DC");
    expect(humanize("work_order")).toBe("Work order");
  });
});
