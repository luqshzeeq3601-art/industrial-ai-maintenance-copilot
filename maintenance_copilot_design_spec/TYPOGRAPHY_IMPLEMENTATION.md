# Maintenance Copilot Typography Implementation

## 1. Recommended Font Setup

Use:

- **Inter** — primary UI font
- **Geist Mono** — technical data font

Example:

```css
:root {
  --font-ui: "Inter", "Segoe UI", Arial, sans-serif;
  --font-data: "Geist Mono", "SFMono-Regular", Consolas, monospace;
}
```

Apply Inter globally:

```css
body {
  font-family: var(--font-ui);
  font-size: 14px;
  line-height: 1.5;
  color: #0f172a;
}
```

Use Geist Mono only through a dedicated utility:

```css
.font-data {
  font-family: var(--font-data);
  font-variant-numeric: tabular-nums;
}
```

---

## 2. Suggested CSS Tokens

```css
:root {
  --text-page-title: 30px;
  --text-primary-title: 26px;
  --text-section-title: 18px;
  --text-card-title: 16px;
  --text-body: 14px;
  --text-table: 13px;
  --text-meta: 12px;
  --text-data-lg: 28px;
  --text-data-md: 16px;

  --weight-regular: 400;
  --weight-medium: 500;
  --weight-semibold: 600;
  --weight-bold: 700;

  --leading-tight: 1.2;
  --leading-normal: 1.5;
}
```

---

## 3. Tailwind Mapping

Recommended usage:

```tsx
<h1 className="text-[30px] leading-9 font-bold tracking-[-0.02em]">
  Dashboard
</h1>

<h2 className="text-lg leading-6 font-semibold">
  Andon board
</h2>

<p className="text-sm leading-[21px] text-slate-600">
  Fleet overview, asset status, and maintenance insights
</p>

<span className="font-mono text-[13px] tabular-nums">
  EQ-1000
</span>

<strong className="font-mono text-[28px] leading-8 font-semibold tabular-nums">
  145,019 h
</strong>
```

---

## 4. Refactor Rules

When updating existing pages:

1. Replace serif or inconsistent display fonts with Inter.
2. Remove monospace from normal UI labels and headings.
3. Keep monospace only for IDs, codes, timestamps, hours, and measurements.
4. Standardize page titles to 30px.
5. Standardize section titles to 18px.
6. Standardize card titles to 15–16px.
7. Standardize normal UI content to 14px.
8. Increase any important text currently below 12px.
9. Use `tabular-nums` for telemetry and KPI values.
10. Remove unnecessary uppercase and letter-spacing.

---

## 5. Pages to Verify

Apply consistently to:

- Dashboard
- Assets
- Maintenance
- Work Orders
- Analytics
- Reports
- Settings
- Sign In
- Operator Profile
- Dialogs / drawers
- Chatbot
- Tables
- Empty / loading / error states

---

## 6. Visual QA

Verify at:

- 1920×1080
- 1440×900
- 1280×800
- Tablet
- Mobile

Check:

- No clipped titles
- No text collisions
- No overly small metadata
- Consistent line height
- Stable table alignment
- Numeric columns use tabular numerals
- Chat messages remain readable
- Buttons remain at least 44px high where interactive
- Text hierarchy remains obvious without relying only on color
