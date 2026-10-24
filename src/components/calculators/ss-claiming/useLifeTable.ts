"use client";

import { useEffect, useState } from "react";
import { COHORT_TABLE_RANGE } from "@/data/params/ss-claiming-extra";
import type { QxTable } from "@/lib/calc/ss-claiming";
import type { YMD } from "@/lib/calc/dates";
import { SITE } from "@/lib/site";

/** One fetch per page load, shared by every calculator instance; cleared on failure so "Try again" refetches. */
let pending: Promise<QxTable> | null = null;
function loadCohortTable(): Promise<QxTable> {
  if (!pending) {
    pending = fetch(COHORT_TABLE_RANGE.url).then((r) => {
      if (!r.ok) throw new Error(`Life table request failed: HTTP ${r.status}`);
      return r.json() as Promise<QxTable>;
    });
    pending.catch(() => {
      pending = null;
    });
  }
  return pending;
}

const parseIso = (iso: string): YMD => {
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month, day };
};
const ymdKey = (d: YMD) => d.year * 10000 + d.month * 100 + d.day;

/** The date the site's numbers were verified — used for the static render and as a floor for "today". */
export const VERIFIED_ON: YMD = parseIso(SITE.dataVerifiedOn);

export interface LifeTableState {
  table: QxTable | null;
  error: string | null;
  /** "Today": the verified-on date until the browser's clock has been read (inside the effect below). */
  asOf: YMD;
  retry: () => void;
}

/**
 * Fetches SSA's cohort death probabilities (public/data/cohort-qx-tr2026.json) after hydration and reads the browser's
 * date at the same time. The page renders statically with VERIFIED_ON; results that need the table show a skeleton.
 */
export function useLifeTable(): LifeTableState {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ table: QxTable | null; error: string | null; asOf: YMD }>({ table: null, error: null, asOf: VERIFIED_ON });

  useEffect(() => {
    let alive = true;
    // Read the browser's date whether or not the table loads: monthly amounts and break-even ages don't need the table,
    // and must not keep treating the verified-on date as "today" when the fetch fails.
    const now = new Date();
    const today = { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
    const asOf = ymdKey(today) > ymdKey(VERIFIED_ON) ? today : VERIFIED_ON;
    loadCohortTable()
      .then((table) => {
        if (!alive) return;
        setState({ table, error: null, asOf });
      })
      .catch((err: unknown) => {
        const e = err instanceof Error ? err : new Error(String(err));
        (window as unknown as { __syReportError?: (p: { kind: string; name?: string; message: string; stack?: string | null }) => void }).__syReportError?.({
          kind: "error",
          name: e.name,
          message: `ss-claiming life table: ${e.message}`,
          stack: e.stack ?? null,
        });
        if (alive) setState((s) => ({ ...s, error: e.message, asOf }));
      });
    return () => {
      alive = false;
    };
  }, [attempt]);

  return {
    ...state,
    retry: () => {
      setState((s) => ({ ...s, error: null }));
      setAttempt((a) => a + 1);
    },
  };
}
