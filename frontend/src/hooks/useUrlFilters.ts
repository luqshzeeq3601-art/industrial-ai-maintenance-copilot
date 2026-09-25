import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";

/**
 * Filters, sort, and page kept in the URL so views are shareable and survive back/forward.
 * Changing any filter returns to page 1. Pass a module-level `keys` array so it stays referentially stable.
 */
export function useUrlFilters<K extends string>(keys: readonly K[]) {
  const [params, setParams] = useSearchParams();

  const values = useMemo(
    () => Object.fromEntries(keys.map((k) => [k, params.get(k) ?? ""])) as Record<K, string>,
    [params, keys]
  );

  const set = useCallback(
    (patch: Partial<Record<K | "page", string | number | null>>) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(patch) as [string, string | number | null][]) {
            if (value === null || value === "" || value === undefined) next.delete(key);
            else next.set(key, String(value));
          }
          if (!("page" in patch)) next.delete("page");
          return next;
        },
        { replace: true }
      ),
    [setParams]
  );

  const reset = useCallback(
    () =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          [...keys, "page"].forEach((k) => next.delete(k));
          return next;
        },
        { replace: true }
      ),
    [setParams, keys]
  );

  const page = Math.max(1, Number(params.get("page")) || 1);
  return { values, set, reset, page };
}
