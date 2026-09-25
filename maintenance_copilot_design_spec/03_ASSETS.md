# Assets Page + Copilot Assistant

## Purpose
Browse and manage plant assets while allowing the operator to ask contextual maintenance questions.

## Layout
Desktop:
- Main asset table: ~70–75%
- Copilot Assistant panel: ~25–30%

## Header
- Title: `Assets`
- Add Asset
- Compact KPI summaries:
  - Total
  - Running
  - Fault
  - Offline / Maintenance

## Filters
- Search
- Status
- Location
- Asset type
- Reset

## Asset Table
Columns:
- Asset
- ID
- Location
- Hours
- Status
- Next Service
- Actions

Rules:
- Machine name is primary
- Asset ID is secondary and monospace
- Status uses icon + label
- Avoid repeated oversized pills
- Use one-line actions menu

## Copilot Assistant
Persistent right-side agent panel.

Header:
- Copilot Assistant
- Small optional `Beta` label

Default state:
- short greeting
- one sentence describing capability
- 3–4 quick prompts

Example prompts:
- Show assets in fault
- Next service for ApexMill-500
- Open work orders for Lathe-X200
- Show coolant maintenance procedure

Conversation:
- user message
- assistant response
- concise numbered steps
- contextual actions:
  - Open SOP
  - Create work order
  - View asset
  - Show alarms

Input:
- single-line or compact expanding input
- send icon button

Do not let chatbot dominate the page when idle.
