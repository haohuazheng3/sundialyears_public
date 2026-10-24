"use client";

import { NumberField, SelectField } from "@/components/ui/Fields";
import { num, str } from "@/hooks/useUrlState";
import type { Household } from "@/lib/calc/tax-more";
import { MAX_INPUT } from "./kit";

export const FS_OPTIONS = [
  { value: "single", label: "Single" },
  { value: "mfj", label: "Married filing jointly" },
  { value: "hoh", label: "Head of household" },
  { value: "qss", label: "Qualifying surviving spouse" },
  { value: "mfs", label: "Married filing separately" },
] as const;
export type Fs = (typeof FS_OPTIONS)[number]["value"];

export const HH_DEFAULTS = { fs: "mfj" as Fs, age65: 2, ss: 42000, pen: 18000, ira: 20000, int: 3000, cg: 4000 };
export type HH = typeof HH_DEFAULTS;
export const HH_SCHEMA = {
  fs: str(FS_OPTIONS.map((o) => o.value)),
  age65: num,
  ss: num,
  pen: num,
  ira: num,
  int: num,
  cg: num,
};

export function toHousehold(s: HH, over: Partial<Household> = {}): Household {
  return {
    filingStatus: s.fs,
    people65: Math.min(s.age65, s.fs === "mfj" ? 2 : 1),
    ssBenefits: s.ss,
    pension: s.pen,
    iraDistributions: s.ira,
    taxableInterest: s.int,
    qualifiedDividendsLtcg: s.cg,
    ...over,
  };
}

type Key = keyof HH;
const LABELS: Record<Exclude<Key, "fs" | "age65">, { label: string; hint?: string }> = {
  ss: { label: "Social Security benefits (yearly, gross)", hint: "Both spouses on a joint return; box 5 of the SSA-1099." },
  pen: { label: "Pension and annuity income (taxable)" },
  ira: { label: "IRA / 401(k) withdrawals, including RMDs" },
  int: { label: "Interest and non-qualified dividends" },
  cg: { label: "Qualified dividends and long-term gains" },
};

/** Filing status, people 65+, and whichever income lines a calculator needs. */
export function HouseholdFields<S extends HH>({ s, set, show = ["ss", "pen", "ira", "int", "cg"] }: { s: S; set: <K extends keyof S>(k: K, v: S[K]) => void; show?: Exclude<Key, "fs" | "age65">[] }) {
  const max65 = s.fs === "mfj" ? 2 : 1;
  return (
    <>
      <SelectField label="Filing status" value={s.fs} onChange={(v) => set("fs", v as S["fs"])} options={[...FS_OPTIONS]} />
      <SelectField
        label="People on the return who are 65 or older"
        value={Math.min(s.age65, max65)}
        onChange={(v) => set("age65", v as S["age65"])}
        options={Array.from({ length: max65 + 1 }, (_, i) => ({ value: i, label: String(i) }))}
      />
      {show.map((k) => (
        <NumberField key={k} label={LABELS[k].label} hint={LABELS[k].hint} prefix="$" value={s[k] as number} onChange={(v) => set(k, (v ?? 0) as S[typeof k])} min={0} max={MAX_INPUT} />
      ))}
    </>
  );
}
