# Screenshot Capture Guide

All images here are real captures from `http://localhost:3000` (dev seeds only: `tech1`, `EQ-1000`).
Re-capture at 1600x900 or wider, light theme, before any public release that changes the UI.

| File | Embedded in | How to reproduce |
| :--- | :--- | :--- |
| `00-welcome.png` | (spare / PRs) | Fresh load, logged out, `WelcomePage` hero visible. |
| `01-workspace-overview.png` | `README.md` hero | Log in as `tech1`, open asset `EQ-1000`, run a diagnostic query, scroll so Diagnostic Console + Agent workflow trace are visible. |
| `02-approval-card.png` | `README.md` HITL section | As `tech1`, request a CRITICAL work order for `EQ-1000`; capture the `Maintenance Work Order Authorization` card in `Pending Approval` state. |
| `03-dag-analytics.png` | `README.md` Architecture section | Open the `Fleet Telemetry & Andon` tab showing `Fleet Operations & Reliability Analytics` + `Shop Floor Andon Board`. |

Rules: dev data only (never customer plant names), no real secrets in frame,
PNG format, keep each file under ~500 KB (downscale if needed).
Charts in `README.md` come from `reports/figures/` and regenerate with the benchmark scripts - do not screenshot those.
