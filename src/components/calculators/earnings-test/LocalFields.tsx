"use client";

import { useId } from "react";
import { Icon } from "@/components/ui/Icon";
import { MONTHS, MONTHS_SHORT } from "@/lib/format";
import { fromMonthIndex, monthIndex } from "@/lib/calc/dates";

/**
 * Month + year as two plain selects (same look as BirthDateField). Value is a month index (year*12 + month0).
 * Local to the earnings-test calculator; the shared Fields.tsx has no month/year control.
 */
export function MonthYearField({
  label,
  value,
  onChange,
  minIdx,
  maxIdx,
  hint,
}: {
  label: React.ReactNode;
  value: number;
  onChange: (idx: number) => void;
  minIdx: number;
  maxIdx: number;
  hint?: React.ReactNode;
}) {
  const id = useId();
  const { year, month } = fromMonthIndex(value);
  const y0 = Math.min(fromMonthIndex(minIdx).year, year);
  const y1 = Math.max(fromMonthIndex(maxIdx).year, year);
  const years: number[] = [];
  for (let y = y0; y <= y1; y++) years.push(y);
  return (
    <fieldset>
      <legend className="field-label">{label}</legend>
      <div className="grid grid-cols-[1.45fr_1fr] gap-2">
        <div>
          <label htmlFor={`${id}-m`} className="sr-only">
            Month
          </label>
          <select id={`${id}-m`} className="input" value={month} onChange={(e) => onChange(monthIndex(year, Number(e.target.value)))}>
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-y`} className="sr-only">
            Year
          </label>
          <select id={`${id}-y`} className="input" value={year} onChange={(e) => onChange(monthIndex(Number(e.target.value), month))}>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>
      {hint ? <p className="field-hint">{hint}</p> : null}
    </fieldset>
  );
}

/** Twelve big toggle buttons for picking months (1–12). Months not in `enabled` are disabled. */
export function MonthPicker({
  label,
  selected,
  enabled,
  onChange,
  hint,
}: {
  label: React.ReactNode;
  selected: number[];
  enabled: number[];
  onChange: (months: number[]) => void;
  hint?: React.ReactNode;
}) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={`${id}-l`} aria-describedby={hint ? `${id}-h` : undefined}>
      <p id={`${id}-l`} className="field-label">
        {label}
      </p>
      <div className="grid grid-cols-4 gap-2">
        {MONTHS_SHORT.map((m, i) => {
          const mo = i + 1;
          const on = selected.includes(mo);
          const ok = enabled.includes(mo);
          return (
            <button
              key={m}
              type="button"
              aria-pressed={on}
              disabled={!ok}
              aria-label={`${MONTHS[i]}${ok ? "" : " (no benefit this month)"}`}
              onClick={() => onChange(on ? selected.filter((x) => x !== mo) : [...selected, mo].sort((a, b) => a - b))}
              className="btn btn-ghost !gap-1 !px-2 text-[1rem] disabled:cursor-not-allowed disabled:opacity-35 disabled:shadow-none"
            >
              {on ? <Icon name="check" size={16} strokeWidth={2.4} /> : null}
              {m}
            </button>
          );
        })}
      </div>
      {hint ? (
        <p id={`${id}-h`} className="field-hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
