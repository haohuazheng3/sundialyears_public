"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { NumberField } from "@/components/ui/Fields";
import { Icon } from "@/components/ui/Icon";
import { money, pct } from "@/lib/format";
import { track } from "@/lib/analytics";
import {
  JOINT_GAP,
  REF_BALANCE,
  RMD_AGE_NOW,
  RMD_AGE_LATER,
  SPOUSE_EXAMPLE_GAP,
  FIRST_73_BIRTH_YEAR,
  LAST_73_BIRTH_YEAR,
  FIRST_75_BIRTH_YEAR,
  UNIFORM_MAX_AGE,
  factorAt,
  fmtFactor,
  fmtPct,
  jointAt,
  jointApplies,
  lookupCalcHref,
  tableAgeLabel,
} from "./RmdAgeData";

/**
 * Mini lookup for the Joint and Last Survivor Table (Treas. Reg. §1.401(a)(9)-9(d)): owner's age + spouse's age →
 * distribution period. The table may be used only when the spouse is the sole beneficiary all year and more than
 * 10 years younger (Reg. §1.401(a)(9)-5(c)(2)); otherwise the Uniform Lifetime Table applies.
 */
export function RmdAgeJointLookup({
  defaultOwner = RMD_AGE_LATER,
  defaultSpouse = RMD_AGE_LATER - SPOUSE_EXAMPLE_GAP,
}: {
  defaultOwner?: number;
  defaultSpouse?: number;
}) {
  const [owner, setOwner] = useState<number | null>(defaultOwner);
  const [spouse, setSpouse] = useState<number | null>(defaultSpouse);

  const ages =
    owner != null && spouse != null && Math.round(owner) >= RMD_AGE_NOW && Math.round(owner) <= UNIFORM_MAX_AGE && spouse >= 0 && Math.round(spouse) <= UNIFORM_MAX_AGE
      ? { o: Math.round(owner), s: Math.round(spouse) }
      : null;
  const valid = ages != null;
  const o = ages?.o ?? 0;
  const s = ages?.s ?? 0;
  const applies = valid && jointApplies(o, s);
  const uniform = valid ? factorAt(o) : 0;
  const joint = applies ? jointAt(o, s) : 0;
  const period = applies ? joint : uniform;

  // One analytics event per settled lookup (bucketed, no personal data).
  const last = useRef("");
  useEffect(() => {
    if (!valid) return;
    const gap = o - s;
    const key = `${o}|${gap}`;
    if (key === last.current) return;
    const t = setTimeout(() => {
      last.current = key;
      track("calc_rmd_joint_result", { ownerAge: o, gapBucket: Math.max(0, Math.min(40, Math.round(gap / 5) * 5)), table: applies ? "joint" : "uniform" });
    }, 1200);
    return () => clearTimeout(t);
  }, [valid, o, s, applies]);

  const href = valid ? lookupCalcHref(o, s) : "/rmd-calculator";

  return (
    <div className="float p-5 sm:p-7 lg:sticky lg:top-24">
      <h3 className="flex items-center gap-2 text-[1.35rem] font-semibold">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-sun-wash text-sun-ink">
          <Icon name="table" size={16} />
        </span>
        Look up the joint-table factor
      </h3>
      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
        <NumberField
          label="Your age this year"
          suffix="yrs"
          value={owner}
          onChange={setOwner}
          min={RMD_AGE_NOW}
          max={UNIFORM_MAX_AGE}
          hint="The age you reach on your birthday this year, even if it’s in December."
        />
        <NumberField
          label="Your spouse’s age this year"
          suffix="yrs"
          value={spouse}
          onChange={setSpouse}
          min={0}
          max={UNIFORM_MAX_AGE}
          hint="Counts only if your spouse is your sole beneficiary for the whole year."
        />
      </div>

      <div aria-live="polite" className="sunk mt-5 p-5">
        {!valid ? (
          <p className="text-[1.0625rem] leading-relaxed text-ink-2">
            Enter your age ({RMD_AGE_NOW} to {UNIFORM_MAX_AGE}) and your spouse’s age. Lifetime RMDs start at {RMD_AGE_NOW} if you were born {FIRST_73_BIRTH_YEAR}–{LAST_73_BIRTH_YEAR}, and at{" "}
            {RMD_AGE_LATER} if you were born in {FIRST_75_BIRTH_YEAR} or later.
          </p>
        ) : (
          <>
            <p className="eyebrow">{applies ? "Joint and Last Survivor Table" : "Uniform Lifetime Table applies"}</p>
            <p className="num font-display mt-2 text-[2.6rem] font-semibold leading-none text-ink">{fmtFactor(period)}</p>
            <p className="mt-3 text-[1.0625rem] leading-relaxed text-ink-2">
              {applies ? (
                <>
                  Owner {tableAgeLabel(o)}, spouse {tableAgeLabel(s)}: divide by <strong>{fmtFactor(joint)}</strong> instead of {fmtFactor(uniform)}. You must take{" "}
                  <strong>{fmtPct(1 / joint)}</strong> of the balance instead of {fmtPct(1 / uniform)} — on {money(REF_BALANCE)}, that’s{" "}
                  <strong>{money(REF_BALANCE / joint)}</strong> instead of {money(REF_BALANCE / uniform)}, or {pct(1 - uniform / joint, 1)} less.
                </>
              ) : (
                o - s === JOINT_GAP ? (
                  <>
                    With exactly {JOINT_GAP} years between your ages, both tables give the same factor for {tableAgeLabel(o)}: <strong>{fmtFactor(uniform)}</strong>, or{" "}
                    {fmtPct(1 / uniform)} of the balance. The joint table only lowers your RMD once your spouse is {JOINT_GAP + 1} or more years younger.
                  </>
                ) : (
                  <>
                    Your spouse is not more than {JOINT_GAP} years younger, so you use the Uniform Lifetime Table factor for {tableAgeLabel(o)}: <strong>{fmtFactor(uniform)}</strong>,
                    or {fmtPct(1 / uniform)} of the balance.
                  </>
                )
              )}
            </p>
          </>
        )}
      </div>
      <Link href={href} className="btn btn-ghost mt-5 w-full">
        Open in the RMD calculator <Icon name="arrow" size={18} />
      </Link>
    </div>
  );
}
