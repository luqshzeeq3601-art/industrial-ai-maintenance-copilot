# Maintenance Copilot — Design System

## 1. Product Direction

Maintenance Copilot is a light-theme industrial maintenance operations platform.

Primary goals:
- Fast scanning of equipment state
- Clear maintenance actions
- Minimal visual noise
- Strong operational hierarchy
- Consistent desktop UI across all pages
- AI copilot integrated where it adds value, not as decoration

Avoid:
- Glassmorphism
- Neon/glow effects
- Excessive gradients
- Decorative AI visuals
- Large empty hero cards
- Too many pills/badges
- Repeated status dots everywhere
- Excessive nested cards
- Tiny text
- Developer/debug information in operator views
- Long explanatory sentences when an icon + short label is enough

---

## 2. Global Layout

### Desktop
- Target: 1920×1080
- Left sidebar: 220–240px
- Top header: 56–64px
- Main content: fluid width with max-width around 1600–1700px
- Page padding: 24–32px
- Section gap: 20–24px
- Card gap: 12–16px

### Sidebar
Navigation order:
1. Dashboard
2. Assets
3. Diagnostics
4. SOPs
5. Work Orders
6. History
7. Settings

Use:
- outline icon + label
- active row with subtle blue background and left accent
- no oversized icons
- no status counters unless operationally useful

### Header
Include:
- Product logo + Maintenance Copilot
- Plant selector
- Global search
- User avatar, name, role
- Optional notification icon

Do not include:
- model name
- GPU name
- RAG counts
- technical/debug stats
- duplicate system metrics already shown on dashboard

---

## 3. Typography

### Primary
**Inter**

Use for:
- Page titles
- Navigation
- Buttons
- Labels
- Tables
- Body copy
- Chat messages
- Forms

### Technical
**Geist Mono**

Use only for:
- Asset IDs
- Work-order IDs
- Fault codes
- Telemetry values
- Operating hours
- Dates/timestamps where scanning matters

### Scale
| Purpose | Size | Weight |
|---|---:|---:|
| Page title | 30px | 700 |
| Primary asset title | 26px | 700 |
| Section title | 18px | 600 |
| Card title | 15–16px | 600 |
| Navigation | 14px | 500–600 |
| Body | 14px | 400 |
| Table | 13–14px | 400–500 |
| Metadata | 12–13px | 400 |
| Technical ID | 12–13px | 500–600 |
| KPI value | 28–32px | 650–700 |

Rules:
- Sentence case headings
- Avoid serif display fonts
- Avoid excessive uppercase
- Minimum important text: 14px
- Use tabular numerals for measurements
- Do not use monospace for normal UI copy

---

## 4. Color System

### Core
- App background: `#F6F8FB`
- Surface: `#FFFFFF`
- Soft surface: `#F8FAFC`
- Border: `#E2E8F0`
- Primary text: `#0F172A`
- Secondary text: `#475569`
- Muted text: `#64748B`
- Primary blue: `#2563EB`

### Semantic
- Success: `#16A34A`
- Success surface: `#ECFDF3`
- Warning: `#D97706`
- Warning surface: `#FFF7E6`
- Danger: `#DC2626`
- Danger surface: `#FEF2F2`
- Neutral info: `#2563EB`

Use semantic color only where status matters.

---

## 5. Components

### Cards
- Radius: 10–12px
- Border: 1px solid
- Shadow: minimal or none
- Avoid card-inside-card unless hierarchy requires it

### Buttons
- Height: 40–44px
- Primary: blue fill
- Secondary: white + border
- Destructive: red only for destructive actions
- Icon-only buttons must include accessible label

### Status
Prefer:
- icon + short label
- tinted surface only for Fault/Maintenance
- avoid large colored pill repetition

### Tables
- Sticky/clear header where useful
- 44–48px row height
- technical IDs use Geist Mono
- compact filters
- row hover state
- clear empty/loading/error states

### Icons
- Lucide/Phosphor-style outline icons
- simple, consistent stroke
- use icons to reduce unnecessary sentence copy
- avoid decorative 3D icons inside dense operational tables

---

## 6. Interaction States

Every interactive element must define:
- default
- hover
- focus-visible
- active
- disabled
- loading
- error

Accessibility:
- 44px minimum touch target when possible
- keyboard reachable controls
- visible focus ring
- color is never the only status signal
- WCAG AA contrast target
- reduced-motion support

---

## 7. Responsive Behavior

### ≥ 1440px
- Full desktop layout
- Sidebar visible
- Multi-column content

### 1024–1439px
- Slightly narrower sidebar
- Reduce card columns
- Preserve tables with horizontal scroll only when necessary

### 768–1023px
- Collapsible sidebar
- Two-column sections become one or two columns
- Asset assistant panel can move below table

### <768px
- Single-column layout
- Bottom or drawer navigation
- Tables convert to compact cards where necessary
- Preserve primary actions and status readability

---

## 8. Page Set

1. Login / Welcome
2. Dashboard
3. Assets + Copilot Assistant
4. Asset Detail
5. Diagnostics
6. SOPs
7. Work Orders
8. History
9. Settings

Use the page-specific markdown files in this folder as implementation references.
