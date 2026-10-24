"use client";

import { useState } from "react";
import { BarChart } from "@/components/tool/Charts";
import { Segmented } from "@/components/ui/Fields";
import { Icon } from "@/components/ui/Icon";
import { COLA_BY_EFFECTIVE_YEAR } from "@/data/generated/cola-history";
import { COLA_1999 } from "@/data/params/numbers-extra";
import { colaHistory } from "./cola-math";
import { track } from "@/lib/analytics";

type Mode = "paid" | "ssa";

const ROWS = colaHistory(COLA_BY_EFFECTIVE_YEAR, { 1999: COLA_1999.value });
const LATEST = ROWS[ROWS.length - 1];
/** Axis ticks as whole percents; values with one decimal ("2.0%"). */
const pctFmt = (n: number) => (Number.isInteger(n) && n % 5 === 0 ? `${n}%` : `${(Math.round(n * 10) / 10).toFixed(1)}%`);
const pct1 = (n: number) => `${(Math.round(n * 10) / 10).toFixed(1)}%`;

/**
 * Every COLA since 1975. SSA's own table keys each COLA by the month it takes effect (December, or June before 1983),
 * while news reports — and SSA's fact sheets — name it after the year it first shows up in checks. The toggle shows both.
 */
export function ColaHistoryChart() {
  const [mode, setMode] = useState<Mode>("paid");
  const xOf = (r: (typeof ROWS)[number]) => (mode === "paid" ? r.paidYear : r.effectiveYear);
  const first = ROWS[0];

  return (
    <div className="float p-5 sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="text-[1.3rem] font-semibold">Every Social Security COLA since {first.effectiveYear}</h3>
          <p className="mt-1 text-[1rem] text-ink-3">
            {mode === "paid"
              ? `Labeled by the year the raise first reached checks — so the newest bar is the ${LATEST.paidYear} COLA.`
              : `Labeled the way SSA’s table does it: by the month the COLA takes effect — so the newest bar is ${LATEST.effectiveMonth} ${LATEST.effectiveYear}.`}
          </p>
        </div>
        <Segmented
          label="Label years by"
          value={mode}
          onChange={(v) => {
            setMode(v);
            track("cola_history_labels", { mode: v });
          }}
          options={[
            { value: "paid", label: "Year paid" },
            { value: "ssa", label: "SSA’s table" },
          ]}
        />
      </div>
      <div className="mt-5">
        <BarChart
          data={ROWS.map((r) => ({ x: xOf(r), y: r.pct }))}
          yFormat={pctFmt}
          highlight={xOf(LATEST)}
          height={280}
          caption={`Social Security cost-of-living adjustments by ${mode === "paid" ? "year first paid" : "year SSA lists them"}, ${xOf(first)}–${xOf(LATEST)} (SSA). The latest, ${pct1(LATEST.pct)}, is shown dark.`}
        />
      </div>
      <p className="mt-2 flex items-center gap-2 text-[0.95rem] text-ink-3">
        <span className="inline-block h-3 w-3 rounded-sm bg-[var(--ink)]" aria-hidden="true" /> Dark bar: the {LATEST.paidYear} COLA ({pct1(LATEST.pct)}). Bars at zero are
        years with no raise.
      </p>

      <details className="explainer mt-4">
        <summary className="flex min-h-[3rem] cursor-pointer items-center gap-2 font-bold text-ink-2">
          <Icon name="chev" size={18} className="chev transition-transform" /> See the full table ({ROWS.length} COLAs)
        </summary>
        <div className="mt-3 max-h-[28rem] overflow-auto rounded-2xl">
          <table className="table-sy text-[0.98rem]">
            <caption className="sr-only">Social Security COLAs by year paid and by SSA effective date</caption>
            <thead>
              <tr>
                <th scope="col">First paid</th>
                <th scope="col">SSA lists it as</th>
                <th scope="col">COLA</th>
              </tr>
            </thead>
            <tbody>
              {[...ROWS].reverse().map((r) => (
                <tr key={r.effectiveYear} className={r === LATEST ? "is-hit" : undefined}>
                  <td>
                    {r.paidMonth} {r.paidYear}
                  </td>
                  <td>
                    {r.effectiveMonth} {r.effectiveYear}
                  </td>
                  <td className="strong">{r.pct === 0 ? "None (0%)" : pct1(r.pct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
