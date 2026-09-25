# Diagnostics Page

## Purpose
Run diagnostics and inspect live machine telemetry and active fault codes.

## Layout
- Left rail: asset selection
- Main panel: diagnostics workspace

## Header
- Selected asset
- last updated time
- primary `Run diagnostic` action

## Tabs
- Live Data
- Fault Codes
- History

## Live Data
Compact telemetry cards:
- Spindle speed
- Temperature
- Vibration
- Motor current

Below:
- full-width telemetry chart
- time range selector
- series toggles

## Fault Codes
Table:
- Code
- Status
- Description
- Detected
- Actions

Use semantic status only where necessary.

## Rules
- No unnecessary descriptive paragraphs
- Use concise metric labels
- Keep chart legends clear
- Avoid more than 4 concurrent chart colors
