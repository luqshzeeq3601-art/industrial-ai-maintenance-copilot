import { describe, expect, it } from "vitest";
import { toReadings } from "./useTelemetry";

describe("toReadings", () => {
  it("keeps the newest value per metric and builds history oldest first", () => {
    const events = [
      { metric: "dc_bus_voltage", value: 342, unit: "V", severity: "high", timestamp: "2026-09-23 10:02:00" },
      { metric: "thermal_sensor", value: 140, unit: "C", severity: "critical", timestamp: "2026-09-23 10:02:00" },
      { metric: "dc_bus_voltage", value: 360, unit: "V", severity: "medium", timestamp: "2026-09-23 10:01:00" },
      { metric: "dc_bus_voltage", value: 385, unit: "V", severity: "low", timestamp: "2026-09-23 10:00:00" }
    ];
    const readings = toReadings(events);
    expect(readings.map((r) => r.metric)).toEqual(["dc_bus_voltage", "thermal_sensor"]);
    expect(readings[0]).toMatchObject({ value: 342, severity: "high", history: [385, 360, 342] });
    expect(readings[1].history).toEqual([140]);
  });

  it("skips events without a metric or a numeric value", () => {
    const readings = toReadings([
      { event_type: "alarm", value: null },
      { metric: "", value: 3 },
      { metric: "lube_pressure", value: "4.2", unit: "bar" }
    ]);
    expect(readings).toEqual([expect.objectContaining({ metric: "lube_pressure", value: 4.2 })]);
  });
});
