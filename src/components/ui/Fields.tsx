"use client";

import { useId, useState } from "react";
import { parseNumber, MONTHS } from "@/lib/format";

type Affix = "$" | "%" | "yrs" | "mo";

function grouped(n: number, decimals: number) {
  return n.toLocaleString("en-US", { maximumFractionDigits: decimals, minimumFractionDigits: 0 });
}

/**
 * Big, forgiving numeric input. Accepts "1,250,000", "$80k"-free plain digits, keeps commas while typing,
 * and reports a number (or null) on every keystroke so results update instantly.
 */
export function NumberField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  hint,
  min,
  max,
  decimals = 0,
  placeholder,
  id: idProp,
  name,
  required,
}: {
  label: React.ReactNode;
  value: number | null;
  onChange: (n: number | null) => void;
  prefix?: Affix;
  suffix?: Affix;
  hint?: React.ReactNode;
  min?: number;
  max?: number;
  decimals?: number;
  placeholder?: string;
  id?: string;
  name?: string;
  required?: boolean;
}) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const [text, setText] = useState(value == null ? "" : grouped(value, decimals));
  const [focused, setFocused] = useState(false);
  const [prevValue, setPrevValue] = useState(value);

  // Follow external changes (shared links, presets) when the user isn't typing.
  if (!focused && value !== prevValue) {
    setPrevValue(value);
    setText(value == null ? "" : grouped(value, decimals));
  }

  const n = parseNumber(text);
  const outOfRange = n != null && ((min != null && n < min) || (max != null && n > max));

  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <div className="input-affix">
        {prefix ? <span className="affix affix-l">{prefix}</span> : null}
        <input
          id={id}
          name={name}
          inputMode={decimals > 0 ? "decimal" : "numeric"}
          autoComplete="off"
          className={`input num ${prefix ? "has-l" : ""} ${suffix ? "has-r" : ""}`}
          value={text}
          placeholder={placeholder}
          required={required}
          aria-invalid={outOfRange || undefined}
          aria-describedby={hint ? `${id}-hint` : undefined}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            const v = parseNumber(text);
            setText(v == null ? "" : grouped(v, decimals));
          }}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^\d.,-]/g, "");
            setText(raw);
            const v = parseNumber(raw);
            onChange(v);
          }}
        />
        {suffix ? <span className="affix affix-r">{suffix}</span> : null}
      </div>
      {hint ? (
        <p id={`${id}-hint`} className="field-hint">
          {hint}
        </p>
      ) : null}
      {outOfRange ? (
        <p className="field-hint !text-ember" role="alert">
          {min != null && max != null ? `Enter a number between ${grouped(min, decimals || 2)} and ${grouped(max, decimals || 2)}.` : "That number is out of range."}
        </p>
      ) : null}
    </div>
  );
}

export function SelectField<T extends string | number>({
  label,
  value,
  onChange,
  options,
  hint,
  id: idProp,
}: {
  label: React.ReactNode;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  hint?: React.ReactNode;
  id?: string;
}) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <select
        id={id}
        className="input"
        value={String(value)}
        onChange={(e) => {
          const raw = e.target.value;
          const opt = options.find((o) => String(o.value) === raw);
          if (opt) onChange(opt.value);
        }}
      >
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
      {hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  );
}

/** Pill-style choice; state flips on press. */
export function Segmented<T extends string | number>({
  label,
  value,
  onChange,
  options,
  hint,
  size = "md",
}: {
  label?: React.ReactNode;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode }[];
  hint?: React.ReactNode;
  size?: "md" | "lg";
}) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={label ? `${id}-l` : undefined}>
      {label ? (
        <p id={`${id}-l`} className="field-label">
          {label}
        </p>
      ) : null}
      <div className={`seg ${size === "lg" ? "w-full [&>button]:flex-1" : ""}`}>
        {options.map((o) => (
          <button key={String(o.value)} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
      {hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  );
}

export interface BirthDate {
  year: number;
  month: number; // 1-12
  day: number;
}

/** Month / day / year as three plain controls — clearer than native date pickers for most readers. */
export function BirthDateField({
  label = "Date of birth",
  value,
  onChange,
  minYear = 1925,
  maxYear = 1990,
  hint,
}: {
  label?: React.ReactNode;
  value: BirthDate;
  onChange: (v: BirthDate) => void;
  minYear?: number;
  maxYear?: number;
  hint?: React.ReactNode;
}) {
  const id = useId();
  const daysIn = new Date(Date.UTC(value.year, value.month, 0)).getUTCDate();
  const years: number[] = [];
  for (let y = maxYear; y >= minYear; y--) years.push(y);
  return (
    <fieldset>
      <legend className="field-label">{label}</legend>
      <div className="grid grid-cols-[1.45fr_0.8fr_1fr] gap-2">
        <div>
          <label htmlFor={`${id}-m`} className="sr-only">
            Month
          </label>
          <select
            id={`${id}-m`}
            className="input"
            value={value.month}
            onChange={(e) => {
              const month = Number(e.target.value);
              const max = new Date(Date.UTC(value.year, month, 0)).getUTCDate();
              onChange({ ...value, month, day: Math.min(value.day, max) });
            }}
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-d`} className="sr-only">
            Day
          </label>
          <select id={`${id}-d`} className="input" value={value.day} onChange={(e) => onChange({ ...value, day: Number(e.target.value) })}>
            {Array.from({ length: daysIn }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-y`} className="sr-only">
            Year
          </label>
          <select
            id={`${id}-y`}
            className="input"
            value={value.year}
            onChange={(e) => {
              const year = Number(e.target.value);
              const max = new Date(Date.UTC(year, value.month, 0)).getUTCDate();
              onChange({ ...value, year, day: Math.min(value.day, max) });
            }}
          >
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

export function Toggle({ label, checked, onChange, hint }: { label: React.ReactNode; checked: boolean; onChange: (v: boolean) => void; hint?: React.ReactNode }) {
  const id = useId();
  return (
    <div className="flex items-start gap-3">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-8 w-14 shrink-0 rounded-full transition-colors ${checked ? "bg-[var(--ink)]" : "bg-sunk shadow-[inset_0_0_0_1.5px_var(--hairline-2)]"}`}
      >
        <span
          className={`absolute left-1 top-1 h-6 w-6 rounded-full bg-[var(--card)] shadow transition-transform ${checked ? "translate-x-6" : "translate-x-0"}`}
        />
      </button>
      <label htmlFor={id} className="cursor-pointer">
        <span className="block font-bold text-ink">{label}</span>
        {hint ? <span className="field-hint !mt-0.5 block">{hint}</span> : null}
      </label>
    </div>
  );
}
