# Maintenance Copilot Typography System

## 1. Typography Direction

Use a clean, highly readable enterprise type system designed for Full HD desktop dashboards.

### Primary Font
**Inter**

Use for:
- Page titles
- Section headings
- Navigation
- Buttons
- Forms
- Cards
- Tables
- Chatbot messages
- Helper text

Recommended fallback:

```css
font-family: "Inter", "Segoe UI", Arial, sans-serif;
```

### Technical / Data Font
**Geist Mono**

Use only for:
- Asset IDs (`EQ-1000`)
- Work-order IDs (`WO-1024`)
- Fault codes (`E-105`)
- Telemetry values
- Operating hours
- Dates/timestamps where technical scanning matters
- Machine measurements and diagnostic values

Recommended fallback:

```css
font-family: "Geist Mono", "SFMono-Regular", Consolas, monospace;
```

Do not use monospace for normal labels, paragraphs, navigation, headings, or buttons.

---

## 2. Full HD Typography Scale

| Purpose | Size | Weight | Line Height | Font |
|---|---:|---:|---:|---|
| Page title | 30px | 700 | 36px | Inter |
| Asset / primary title | 26px | 700 | 32px | Inter |
| Section title | 18px | 650 | 24px | Inter |
| Card title | 15–16px | 600 | 22px | Inter |
| Navigation | 14px | 500–600 | 20px | Inter |
| Body | 14px | 400 | 21px | Inter |
| Table / list content | 13–14px | 400–500 | 20px | Inter |
| Button | 14px | 600 | 20px | Inter |
| Helper / metadata | 12–13px | 400 | 18px | Inter |
| Label / eyebrow | 11–12px | 600 | 16px | Inter |
| Asset IDs / fault codes | 12–13px | 500–600 | 18px | Geist Mono |
| Primary telemetry | 22–30px | 650–700 | 32px | Geist Mono |
| Secondary telemetry | 14–16px | 550–600 | 22px | Geist Mono |

---

## 3. Hierarchy Rules

- Use **one dominant page title** per page.
- Use sentence case for all headings.
- Avoid ALL CAPS except compact technical labels such as `FAULT`, `LIVE`, or `E-105`.
- Keep normal body copy at **14px minimum** on desktop.
- Avoid text below **12px** except optional timestamps or compact metadata.
- Keep paragraph width reasonably short for chatbot and diagnostic content.
- Use font weight instead of excessive color to establish hierarchy.
- Do not bold entire rows or paragraphs.
- Use tabular numerals for telemetry, hours, percentages, and KPI values.

---

## 4. Dashboard Usage

### Header
- Product name: Inter 16px / 650
- Global search: Inter 14px / 400
- User name: Inter 14px / 600
- User role: Inter 12px / 400

### KPI Cards
- Label: Inter 13px / 500
- Main value: Geist Mono 28–32px / 650
- Supporting text: Inter 12–13px / 400

### Andon / Asset Cards
- Machine name: Inter 15px / 600
- Asset ID: Geist Mono 12px / 550
- Location: Inter 12–13px / 400
- Operating hours: Geist Mono 13px / 550
- Status: Inter 12px / 600

### Tables
- Header: Inter 12px / 600
- Cell content: Inter 13px / 400–500
- IDs / measurements: Geist Mono 12–13px / 500

### Chatbot
- Assistant / user text: Inter 14px / 400
- Assistant title: Inter 14px / 600
- Timestamp: Inter 11–12px / 400
- Diagnostic codes / values: Geist Mono 12–13px / 500
- Input: Inter 14px / 400

---

## 5. Accessibility

- Minimum normal text size: **14px** where possible.
- Minimum compact metadata: **12px**.
- Body line height: **1.45–1.55**.
- Heading line height: **1.15–1.3**.
- Maintain strong contrast between primary, secondary, and disabled text.
- Do not communicate status through color alone.
- Avoid ultra-light font weights.
- Use `font-weight: 400` minimum for body text.
- Use `font-weight: 500–700` for hierarchy.

---

## 6. Anti-AI-Slop Typography Rules

Avoid:
- Serif display fonts for dashboard titles
- Mixing more than two font families
- Excessive uppercase labels
- Tiny gray text
- Letter spacing on normal body text
- Random bold words
- Oversized 40px+ dashboard headings
- Monospace used everywhere
- Decorative font treatments
- Different typography scales on every card

The interface should feel like a professional industrial operations product, not a generic generated SaaS template.
