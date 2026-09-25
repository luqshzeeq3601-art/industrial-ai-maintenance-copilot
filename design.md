# Maintenance Copilot — Design

The design source of truth is [`maintenance_copilot_design_spec/`](maintenance_copilot_design_spec/DESIGN.md):

- [`DESIGN.md`](maintenance_copilot_design_spec/DESIGN.md) — layout, color, components, interaction states, responsive rules
- [`TYPOGRAPHY.md`](maintenance_copilot_design_spec/TYPOGRAPHY.md) and [`TYPOGRAPHY_IMPLEMENTATION.md`](maintenance_copilot_design_spec/TYPOGRAPHY_IMPLEMENTATION.md) — type scale and tokens
- `01_LOGIN.md` … `09_SETTINGS.md` — per-page specs, with PNG mockups in the same folder

Tokens are implemented in `frontend/src/index.css` (`@theme`). Components use token utilities, never raw hex.

## Intentional deviations from the mockups

| Mockup | Implementation | Reason |
|---|---|---|
| Diagnostics live telemetry plots rpm, °C, mm/s and A on one y-axis | Four stacked small multiples sharing a time axis and crosshair | Different units cannot share one scale |
| KPI deltas and trend bars | Shown only when the API returns a real previous period / daily series | No invented metrics |
| Repairs by fault type uses red for the top bar | Single-hue bars sorted by count | Status red is reserved for status |
| Four telemetry series in blue, orange, violet, green | Every series in the accent blue; each small multiple is titled | Identity comes from the row title, and status colors stay reserved |
| Fault-code status "Pending" | Real alarm states: Active, Acknowledged, Cleared | Label not in the data |
| Asset Detail "View 3D" | Omitted | No 3D asset exists |
| Plant selector dropdown | Static label until more than one plant exists | No dead controls |
| Assets "Add Asset" button | Omitted | The API has no endpoint to register equipment |
| Login role cards | One-click demo sign-in, shown only in development or with `VITE_DEMO_SIGNIN=true` | Production bundles contain no demo passwords |
| Approvals sidebar item (old UI) | "Pending approval" tab in Work Orders (supervisor/admin) | Spec sidebar has 7 items |

## Signature element

The **andon stack light** (`frontend/src/components/ui/AndonLight.tsx`): a three-segment vertical light — red top, amber middle, green bottom — with only the current state lit. It encodes status by position as well as color and appears on Andon board cards and the Asset Detail header only.
