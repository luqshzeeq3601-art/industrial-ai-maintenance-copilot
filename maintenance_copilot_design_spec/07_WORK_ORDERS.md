# Work Orders Page

## Purpose
Create, assign, track, and close maintenance work orders.

## Header
- Title: `Work Orders`
- Create Work Order

## Status Tabs
- All
- Open
- In Progress
- Closed

## Filters
- Search
- Asset
- Priority

## Table
Columns:
- Work Order ID
- Asset
- Title
- Priority
- Status
- Assignee
- Due Date

Rules:
- ID in Geist Mono
- priority uses restrained semantic tag
- status must be readable without color alone
- due date can use danger emphasis only when overdue

## Interaction
- row click opens work order detail
- pagination
- filter persistence where practical
