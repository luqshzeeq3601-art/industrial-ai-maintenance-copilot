# Maintenance Copilot — Design

Source of truth for page layout, components, states, and design tokens.
Covers implemented UI in `frontend/src/App.tsx:1` plus specified-but-missing pages from `docs/roadmap/welcome-login-plan.md:1` and `docs/screenshots/CAPTURE.md:1`.

## 1. Information architecture / page map

| # | Page / view | Route/gate | Status | Spec / impl |
|---|-------------|------------|--------|-------------|
| P0 | Global shell (nav rail, ops header, mobile tabs) | always | implemented | `frontend/src/App.tsx` |
| P1 | Welcome (logged-out, 3-col onboarding) | `!currentUser` gate | **missing** — `workspace/WelcomePage.tsx` does not exist | `docs/roadmap/welcome-login-plan.md:8`, `docs/screenshots/CAPTURE.md:8` (`00-welcome.png`) |
| P2 | Workspace Command Deck (logged-in, 3-col) | default | implemented | `frontend/src/App.tsx:329` |
| P3 | Fleet Register (col 1) | embedded P2 | implemented | `frontend/src/components/workspace/FleetRegisterPanel.tsx:29` |
| P4 | Copilot stage (col 2: AssetHeader + thread + QueryBar) | embedded P2 | implemented | `frontend/src/components/workspace/AssetHeader.tsx:33`, `ConversationThread.tsx:120`, `QueryBar.tsx:39` |
| P5 | Telemetry Inspector + Work Order History (col 3) | embedded P2 | implemented | `frontend/src/components/workspace/TelemetryInspectorPanel.tsx:37` |
| P6 | Operator auth modal (sign in / profile) | overlay `authOpen` | implemented | `frontend/src/components/AuthModal.tsx:107` |
| P7 | HITL approval card (pending/approved/rejected) | inside assistant bubble | implemented | `frontend/src/components/ActionApprovalCard.tsx:170`, `docs/screenshots/CAPTURE.md:10` (`02-approval-card.png`) |
| P8 | Agent workflow strip | bottom of thread | implemented | `frontend/src/components/visualization/AgentWorkflowDag.tsx:30` |
| P9 | Fleet Operations & Reliability Analytics (KPIs + Andon + charts) | nav rail `Dashboard` (`view=dashboard`) | implemented | `frontend/src/components/visualization/AnalyticsDashboardView.tsx:62`, `docs/screenshots/CAPTURE.md:11` (`03-dag-analytics.png`) |
| P10 | Shop Floor Andon Board | embedded P9 | implemented | `frontend/src/components/visualization/AndonStrip.tsx` |
| P11 | Asset Detail Drawer (slide-over) | **orphaned** — never opened | built, unwired | `frontend/src/components/visualization/AssetDetailDrawer.tsx:71` |
| P12 | Asset dossier bento (`AssetPanel`) | **orphaned** — never imported | built, unwired | `frontend/src/components/workspace/AssetPanel.tsx:25` |
| P13 | Mobile views (Fleet / Copilot / Telemetry) | `<1024px` via `mobileTab` | implemented | `frontend/src/App.tsx:287` |

## 2. Design system

Tokens live in `frontend/src/index.css:3` (`@theme`). Components use token utilities (`bg-panel`, `text-muted`, `border-line`, `bg-status-fault`…), never raw hex. The only remaining literal is the categorical Software/PLC violet in `FaultDistributionChart.tsx`.

- Surfaces: `paper #F3F6FA` gray-blue canvas · `panel #FFFFFF` · `sunken #F7F9FC` (nav rail, header, row hover, tiles) · `wash #F1F5F9` (chips, pressed, bar tracks).
- Lines: `line #E3E8EF` dividers · `line-strong #CBD5E1` control borders.
- Text: `ink #0F172A` headings · `body #334155` · `muted #475569` secondary/labels (7.6:1) · `subtle #64748B` icons/placeholders · `faint #94A3B8` decorative separators only (never text).
- Deck: `deck #111827` dark surfaces only (analytics availability card, avatar); primary buttons are accent blue.
- Categorical: `category-plc #5B21B6` (fault chart only). Charts use `var(--color-*)`, no hex literals in components.
- Semantic sets, each `{base, -ink, -bg, -line}`: accent `#2563EB` — the single product blue for primary buttons, selection, focus, active tab/nav, KPI icons (`accent-hover #1D4ED8`, `accent-press #1E40AF`) · success `#15803D` · warn `#B45309` · danger `#B91C1C`. On the dark header use `accent-on-deck #7DD3FC` / `success-on-deck #4ADE80`.
- Status signal (dots, bars, andon), always paired with a text label: `status-ok #16A34A`, `status-maint #F59E0B`, `status-fault #DC2626`.
- Red is reserved for faults/destructive actions. Selection uses accent (`bg-accent-bg` + 3px inset accent bar), never red.
- Typography: Geist sans + Geist Mono (`frontend/index.html:22`, `index.css:4`). Display `display-xl` clamp 1.75–2.5rem / `display-md` 1.125rem, tracking -0.02em (`index.css:64`). Asset title 26px bold (`AssetHeader.tsx:45`); panel titles 15–16px bold; labels 11–13px uppercase mono; body 13–14px; tabular-nums for all telemetry (`index.css:92`).
- Radius: outer 12 / panel 8 / inner 6 / flag 4 (`index.css:41`). Cards `rounded-xl`, pills/inputs `rounded-lg`, badges `rounded-md`.
- Shadows: tinted single-source-top xs/sm/md (`index.css:49`); workspace panels `shadow-[var(--shadow-tinted-xs)]`, modal `-md`. Nested cards get a border, no shadow.
- Z: bar 20 / pane 10 / pop 40 / overlay 50 (`index.css:35`). AuthModal + drawer use `z-50` (`AuthModal.tsx:109`, `AssetDetailDrawer.tsx:72`).
- Motion (GPU-only): `rise-in` 0.45s, `slide-over` 0.32s, `fade-in` 0.2s, `shimmer` skeleton, `pulse-alarm` 2s red / `pulse-amber` 2.5s (`index.css:175`). `prefers-reduced-motion` disables all (`index.css:384`).
- Texture: none in the workspace (grain overlay and cursor spotlight removed as decoration); welcome-gate `plate/rivet/ticket/stamp` styles (`index.css:341`) reserved for P1.
- A11y: `skip-link`, `:focus-visible` 2px accent, compact 40px controls on fine pointers that grow to 44px on touch (`pointer-coarse:`), primary actions always 44px, `role=tablist/tab`, `role=dialog aria-modal`, `role=progressbar`, `role=status/alert`, `aria-label` on icon buttons, `custom-scrollbar` 5px. Clickable rows are `<button>`s (fleet rows `aria-pressed`, work orders, overdue card); conversation is `role=log aria-live=polite`; auth modal closes on Escape and autofocuses username.

## 3. P0 — Global shell

**Current (simplified):** sidebar = logo + main navigation only (`Dashboard` / `Assets` / `Work Orders` / `Diagnostics` / `SOP & Knowledge`; icons at lg, 208px with labels at xl). 60px header = copilot search (Enter sends, Ctrl/Cmd+K focuses) · plant status `Uptime %`, `Faults n` (red), `In maintenance n` (amber) at md+ · operator button (initials, name, role; green role text for approvers → auth modal) · new-conversation button. No hardware, model, RAG or embedding details anywhere in the operator UI (`/api/stats` is no longer fetched). Below lg: tabs Fleet / Asset / Telemetry / Dashboard.

_Previous spec (superseded):_

`frontend/src/App.tsx:190` root `flex-col h-[100dvh] bg-paper text-ink`; skip link → `main#workspace`. Only one `h1` (asset name); the brand is not a heading.

Header (52px, `bg-deck`): Hexagon logo + `Maintenance Copilot` / `Command Deck` (md+); `dl` of metrics — `LangGraph multi-agent` static green dot (sm+), `Plant uptime` = operational ÷ fleet size (md+), `{maintenance_logs_count} work orders` from `/api/stats` (lg+), `RTX 3070 / Qwen2.5 7B` (xl+), separated by 1px left borders; user button (`App.tsx:240`) Sign In gray / TECH blue (`tech`) / SUP green (`supervisor/admin`) with `ShieldCheck`/`Wrench` icons + reset-session icon button.

Mobile tab switcher (`<lg`): 3 equal-width segments Fleet (count) / Copilot / Telemetry, active `bg-deck-raised text-white`.

Footer (32px): left mono `{equipment_count} plant assets | {indexed_chunks} RAG chunks`; right mono `LLM {llm_model} | Embeddings {embedding_model}` (md+).

## 4. P1 — Welcome (logged-out) [MISSING — must build]

Spec `welcome-login-plan.md:8`: new `workspace/WelcomePage.tsx`, 3-column onboarding matching mockup — (1) Login card POST `{apiBase}/api/v1/auth/login` `credentials:include`, JWT Role Active badge; (2) Fleet Rail preview from `equipment` prop; (3) Asset Header preview from `selectedMachine` + fault props + Check Alarm → `onCheckAlarm`. `App.tsx` must gate `if (!currentUser) return <WelcomePage/>` (header role badge + Sign in/out stays). Accept: logged-out first paint = 3-col welcome; `tech1`/`supervisor1` login works; `npm run lint` + `build` green. Screenshot `00-welcome.png`: fresh load logged out, hero visible.

## 5. P2 — Workspace Command Deck (logged-in)

`App.tsx:329` `main flex-1 min-h-0 p-3 lg:p-4`; grid `max-w-[1920px] lg:grid-cols-[280px_1fr_320px] xl:[300px_1fr_340px] 2xl:[320px_1fr_360px] gap-3/4`. Desktop shows all three columns; mobile shows one per `mobileTab` (`fleet`/`copilot`/`telemetry`).

Data: `API_BASE = VITE_API_URL || http://localhost:8000` (`App.tsx:29`); fallbacks `stats {10, 560, 142, qwen2.5:7b, bge-large}` (`App.tsx:39`), `DEFAULT_EQUIPMENT` 10 assets EQ-1000–EQ-1009 (`defaults.ts:5`), `DEFAULT_LOGS_EQ1000` 3 logs, `DEFAULT_INITIAL_MESSAGES` E-402 thread + `ACT-8492` approval demo (`defaults.ts:60`). Effects fetch `/api/v1/auth/me`, `/api/stats`, `/api/equipment`, `/api/equipment/{id}/history` (`App.tsx:57`). `handleSend` POST `/api/chat` stores `answer/workflow_trace/citations/abstain/pending_action/action_result` (`App.tsx:105`); offline → abstain error bubble. Preset prompts: `checkAlarm` E-402 meaning, `openSop` spindle LOTO SOP, `auditLogs` recurring faults, `runDiagnostic` status (`App.tsx:172`).

## 6. P3 — Fleet Register

`FleetRegisterPanel.tsx` panel: Truck `Fleet register` + live count (`14 assets` / `3 of 14`); search with clear button (filters id/name/location); 3-col grid `1fr / 64px / 96px` — ASSET (mono ID + name), LOCATION (2 lines), STATUS / HRS (dot + label over mono hours, right-aligned); rows are `<button aria-pressed>`, selected `bg-accent-bg` + inset accent bar; empty state names the query and offers `Clear filter`. Counts: EQ-1000 fault, EQ-1003 maintenance, 8 operational (seed).

## 7. P4 — Copilot stage

**Current:** `AssetHeader` = breadcrumb (the only place the asset ID repeats), 26px name + one status badge, plain meta line (type | plant, cell | criticality), one service-interval meter (hours of 10,000, red/amber/green status text, `Service checklist` when due). No glyph tile, ID chip, tag pills or KPI cards. Tabs Overview / Diagnostics / SOPs / Work orders stay pinned while the header scrolls away (compact status dot + name). Overview = `FaultBanner` (fault assets only) + thread + one-line agent workflow row. Tab panels are flat sections (dividers, no nested cards). Chat: right-aligned user bubbles, `Copilot` label instead of avatars, sources as one text line, abstention as an amber note, delivery failures as a red `error` message.

_Previous spec (superseded):_

`AssetHeader.tsx:33`: breadcrumb `Assets > {id}`; 26px `{name}` + red alarm badge `! {faultCode} {SUMMARY}` when `status=fault` (fallback `E-402 SPINDLE THERMAL OVERLOAD`, `AssetHeader.tsx:28`); subtitle `{id} | {type} | Installed 2020` (year hardcoded); 3 bordered quick actions `Check alarm {code}` / `LOTO safety SOP` / `SQL log audit` (wrap at sm+, single horizontally scrolling row below sm). Title 22px mobile / 26px sm+.

`ConversationThread.tsx:120` scroll `px-5 py-4`: user row `U` avatar + gray bubble + mono timestamp; assistant `AI` avatar + `Maintenance Copilot` + timestamp + `FormattedContent` (bold/code/bullets/numbered dark badges/`Recommended next steps`); citations chips (`BookOpen` + doc/source, snippet tooltip); abstention red alert `Deterministic abstention enforced`; `pending_action` → P7 card; loading `Coordinating multi-agent diagnostics...` + skeletons; bottom P8 strip; autoscroll `chatEndRef`.

`QueryBar.tsx:39`: attach pdf/txt/log/csv/json → chip + `[Attachment: f] query`; MessageSquare input `Ask about alarms, SOPs, or work orders...` focus ring; clear X; paperclip; dark `Query` submit (spinner while `loading`), disabled when empty (`bg-line-strong text-muted`); label is sr-only below sm (icon button).

## 8. P5 — Telemetry Inspector + Work Order History

**Current:** one right-rail panel (sizes to content, single scroll) with divided sections: Telemetry (latest reading per metric from `GET /api/v1/telemetry/events`, 2×2 values with severity bars, `Sample data` note offline), actions (Run diagnostic primary; `SOP {code}` and `History` secondary), Recent work orders (latest 5, `View all n` → Work orders tab, status as coloured text, no pills).

_Previous spec (superseded):_

`TelemetryInspectorPanel.tsx:37` scroll col gap-3: top card `Telemetry Inspector | {id}`; property rows Asset ID mono / name / type / location / criticality capitalize with Tag/Target/Wrench/MapPin/ShieldCheck icons; Operating hours 20px mono + bar `/10000h` colored by band (<80% `status-ok`, 80–100% `status-maint`, >100% `status-fault`) + `Service at 10,000 h` and `{pct}% · {Within interval|Service window|Overdue}`; `Run Diagnostic` dark button (Play); overdue `Maintenance overdue +Xh` warn-token button → overdue checklist query. Bottom card `Work order history` + count, empty state `No work orders recorded for {id}.`: rows dot red OPEN (`severity OPEN` or `E-` code) / green CLOSED + `fault_code action` bold + OPEN/CLOSED badge + `Technician x` + description; click → investigate query. OPEN logic `TelemetryInspectorPanel.tsx:183`.

`WorkOrderHistory.tsx:11` grouped variant (used by P12): group by `fault_code`, `×n` count, OPEN if severity critical/high, expandable occurrences `started_at · tech · duration`.

## 9. P6 — Auth modal

`AuthModal.tsx:107` overlay `z-50 bg-black/60`: card `max-w-md`; header Hexagon + `Operator Sign In/Profile`; active view: `Active Operator` + role badge green supervisor/admin / blue tech + name + `@user` + permission banner (supervisor: approve actions/alarms/order parts; tech: diagnostic only, critical needs approval) + `Sign Out / Disconnect`. Sign-in view: error alert, Username/Password 44px inputs, dark Sign In; `Quick 1-Click Role Login`: Supervisor `@supervisor1 Full Approvals` green / Technician `@tech1 Diagnostic Only` blue, hardcoded `SupervisorPass123!`/`TechPass123!`. API `POST /api/v1/auth/login|logout` `credentials:include`; offline fallback synthesizes user (`includes("sup")`) with `demo-csrf-token` (`AuthModal.tsx:58`).

Roles: `technician` diagnostic only; `supervisor`/`admin` approve (gated header button colors `App.tsx:243`, approval card `ActionApprovalCard.tsx:48`, modal banners).

## 10. P7 — HITL approval card

**Current:** flat card with a 3px status-coloured left border; title + `Needs approval` / `Approved` / `Rejected` text status; summary; Asset / Priority / Scheduled / Alarm / Scope fields; `Requested by`. Action ID, thread/session ID and the LangGraph subtitle are no longer shown. Non-approvers see one line plus `Sign in as supervisor`; approvers get `Reject` and `Approve and execute`. API calls unchanged.

_Previous spec (superseded):_

`ActionApprovalCard.tsx` panel card (no cursor spotlight), left border amber pending / green approved / red rejected. Header: icon per type (Wrench work order / Calendar inspection / Bell alarm), `Maintenance Work Order Authorization` etc. title + mono `action_id`, sub `Human-in-the-loop gateway · LangGraph interrupt`, static status badge `Pending approval` / `Approved` / `Rejected` (`role=status`; no pulse — the amber border carries the attention). Minimum text size 11px (mono labels), 13px body. Body: summary 14px; args grid mono Target Asset / Priority color-coded critical red high amber else green / Scheduled For / Alarm ID / Description; `Initiated by requester (role)` + `Thread …`. Pending controls: non-supervisor lock banner (stacks below sm) + `Log In as Supervisor`; supervisor `Reject` (reason input → `Confirm Rejection`) + `Approve & Execute` green. Post-decision panels with approver + `work_order_id/inspection_id/alarm_id/message`. API `POST /api/v1/actions/{id}/approve|reject {reason}`; offline fallback auto-resolves. Types `PendingActionPayload` (`ActionApprovalCard.tsx:15`); `Message.pending_action/action_result` (`types.ts:14`).

## 11. P8 — Agent workflow strip

**Current:** one row under the thread: `Agent workflow` ✓ Supervisor › ✓ Retrieval › ✓ Diagnostic, `Details` expands the trace summaries.

_Previous spec (superseded):_

`AgentWorkflowDag.tsx:30` white card `Agent workflow` + `View/Hide details`: AppWindow lead + Supervisor `Classify & plan` → Retrieval `Search SOPs & history` → Diagnostic `Analyze & recommend`, completed green check from `workflow_trace` else all-complete idle; click step → detail pane (`agent · action`, summary, Close); expanded → full trace list. Latest message trace shown (`ConversationThread.tsx:118`).

## 12. P9/P10 — Analytics + Andon [BUILT, UNWIRED — needs tab]

**Current:** `AnalyticsDashboardView` = title, update time, and Refresh · three KPI cards (Plant availability, Total operating hours, Cumulative downtime) with shaded SVG illustrations from `KpiIcon3D.tsx` and real-data mini charts (unit status, hours per unit, downtime by fault category) visible when card content width allows · `AndonStrip` (asset count, status filters, search, cards with type-specific SVG machine thumbnails from `MachineThumbnail3D.tsx`, ID, name, location, hours, and status label) · `FleetHealthDonut` (legend filters the board) · `FaultDistributionChart` (repairs per category, severity mix of fault codes) · `OperatingHoursBarChart` (top 5 by hours, compact overdue warning, wear bars, criticality tags, show all). No invented deltas or compliance claims. Loading skeletons and retryable error state remain.

_Previous spec (superseded):_

`AnalyticsDashboardView.tsx:62` (`apiBase/equipmentList/selectedMachineId/onSelectMachine`): masthead `Plant Telemetry & Operational Health / Fleet Operations & Reliability Analytics` + `Clear Filters` + `Refresh Telemetry`; offline alert + retry; KPI grid — Availability dark navy card `uptime%` + `n of total running`, Total Operating Hours white card + fleet average, Cumulative Downtime white card, `Safety Guardrail Active | ISO-13849 Compliant` green banner; `Shop Floor Andon Board` card; charts row Donut (5-col) + Fault ledger (7-col); full-width hours ledger. Loads `GET /api/analytics/fleet-health|fault-categories` with skeleton + error states. Filters: donut status segment filters hours ledger; category filter state reserved.

`AndonStrip.tsx:25`: header Radio pulse `Shop Floor Andon Board LIVE FEED` + `Real-time line status across N cells`; filters All / Alarms (red pulse) / Service (amber) / Running (green) with counts; cells grid 1/2/3/5 cols: ID + ALARM red pulse / MAINT amber / OK green badges, name, location + hours mono, selected double-ring navy; click selects asset.

Charts: `FleetHealthDonut.tsx:30` (distribution/total/uptime, clickable status segments); `FaultDistributionChart.tsx:28` (categories/incidents/severities, clickable category); `OperatingHoursBarChart.tsx:20` hours ledger with `<8k` dark / `8–10k` amber / `>10k` red + criticality badges + `Service window exceeded +Xh` warnings + `Preventive Service Standard: 10,000 hrs` footer; defines canonical `EquipmentData {machine_id,name,type,location,status,operating_hours,criticality}` (`OperatingHoursBarChart.tsx:4`).

To wire: add `Fleet Telemetry & Andon` tab/route rendering `AnalyticsDashboardView` (per `CAPTURE.md:11` `03-dag-analytics.png`).

## 13. P11/P12 — Drawer + dossier [BUILT, UNWIRED]

`AssetDetailDrawer.tsx:71` right slide-over `max-w-lg`: header `id • name` + X (ESC/backdrop close); spec bento Type/Bay/Hours/Criticality; dark `Initiate Multi-Agent Diagnostic Query`; `Recent Work Order Records (n)` with action/parts/tech/duration cards; loads `GET /api/equipment/{id}/history`. No opener wired — attach to fleet row / Andon cell / hours-ledger row action.

`AssetPanel.tsx:25` (alternative dossier, never imported): spec bento ID/Class/Bay/Criticality + `Cell Telemetry Active`; `Operating Wear Lifecycle` gauge with 0 / `8,000 Caution` / `10,000 Mandatory Overhaul` scale + overdue red banner `+X hrs overdue`; dark `Initiate Multi-Agent Diagnostic Audit` CTA; grouped `WorkOrderHistory`. Decide: keep P5+drawer as canonical, remove or route-gate `AssetPanel`.

## 14. Responsive + states

- Breakpoints: `<sm` stacks header badges hidden, footer tagline hidden; `sm` shows agent badge; `md` uptime + divider; `lg` work orders + 3-col grid + hides mobile tabs; `xl` hardware badge; `2xl` widens rails. Grids: Andon 1/2/3/5, KPI 2/12, charts 1/12, hours ledger scroll `max-h-340px`.
- Loading: skeletons (thread, history, analytics `StatSkeleton`); spinner on Query/Refresh/Auth.
- Empty: fleet filter none; `No work orders yet` dashed card; drawer `No recent logs`; analytics error `Analytics feed offline` + retry.
- Offline: cached stats/fleet/logs + demo auth + approval fallback keep demo clickable without backend.

## 15. Gaps / TODO

1. Build `workspace/WelcomePage.tsx` + `!currentUser` gate (`welcome-login-plan.md:21` accept).
2. ~~Add Analytics tab/route~~ done (nav `Dashboard`); re-capture `03-dag-analytics.png`.
3. Wire `AssetDetailDrawer` opener; resolve `AssetPanel` vs `TelemetryInspectorPanel` duplication (single `OVERHAUL_THRESHOLD` in `types.ts:47`).
4. ~~`Installed 2020`~~ removed. Replace the `E-402` fallback with live data or explicit demo labels (header uptime and work-order count are now derived).
5. Replace `frontend/README.md:1` Vite template with project frontend docs.
6. Re-capture `00/01/02/03` PNGs per `CAPTURE.md:6` (1600×900+, light, dev seeds `tech1`/`EQ-1000`, <500KB each).
