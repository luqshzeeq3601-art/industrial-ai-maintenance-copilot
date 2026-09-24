export const API_BASE: string = import.meta.env.VITE_API_URL || "";

/**
 * Seeded sample data may stand in for an unreachable API only in development or in builds that opt in
 * with VITE_DEMO_DATA=true. Production builds show the real error instead, and demo data is always labelled.
 */
export const DEMO_DATA: boolean = import.meta.env.DEV || import.meta.env.VITE_DEMO_DATA === "true";

/** Where a panel's data came from; "demo" is rendered with a visible label. */
export type DataSource = "live" | "demo";

export type LoadState = "loading" | "ready" | "error";
