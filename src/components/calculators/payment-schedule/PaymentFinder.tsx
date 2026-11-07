"use client";

import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { CalculatorShell } from "@/components/tool/CalculatorShell";
import { ResultHero, Callout } from "@/components/tool/Result";
import { ShareBar } from "@/components/tool/ShareBar";
import { Segmented, SelectField, Toggle } from "@/components/ui/Fields";
import { useUrlState, num, bool } from "@/hooks/useUrlState";
import { yearSchedule, groupForBirthDay, prettyDate, monthName, type PaymentGroup } from "@/lib/calc/payment-schedule";
import { track } from "@/lib/analytics";

const DEFAULTS = { bd: 15, y: 2027, early: false, ssi: false };
const noopSubscribe = () => () => {};
const ordinal = (n: number) => {
  const t = n % 100;
  if (t >= 11 && t <= 13) return `${n}th`;
  return `${n}${({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th"}`;
};

const GROUP_LABEL: Record<PaymentGroup, string> = {
  wed2: "second Wednesday",
  wed3: "third Wednesday",
  wed4: "fourth Wednesday",
  third: "3rd of the month",
  ssi: "1st of the month (SSI)",
};

export function PaymentFinder() {
  const { state: s, set } = useUrlState(DEFAULTS, { bd: num, y: num, early: bool, ssi: bool });
  const group: PaymentGroup = s.early || s.ssi ? "third" : groupForBirthDay(s.bd);
  const schedule = useMemo(() => yearSchedule(group, s.y), [group, s.y]);
  const ssiSchedule = useMemo(() => (s.ssi ? yearSchedule("ssi", s.y) : []), [s.ssi, s.y]);

  // "Next payment" depends on today's date → null during SSR/hydration, the local date afterwards.
  const today = useSyncExternalStore(
    noopSubscribe,
    () => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    },
    () => null,
  );
  const next = today ? schedule.find((p) => p.date >= today) : undefined;

  const last = useRef("");
  useEffect(() => {
    const key = `${group}|${s.y}`;
    if (key === last.current) return;
    const t = setTimeout(() => {
      last.current = key;
      track("calc_payment_schedule_result", { group, year: s.y, ssi: s.ssi });
    }, 1200);
    return () => clearTimeout(t);
  }, [group, s.y, s.ssi]);

  const inputs = (
    <>
      <Segmented
        label="Which year?"
        value={s.y}
        onChange={(v) => set("y", v)}
        size="lg"
        options={[
          { value: 2026, label: "2026" },
          { value: 2027, label: "2027" },
        ]}
      />
      <SelectField
        label="Day of the month you were born"
        value={s.bd}
        onChange={(v) => set("bd", v)}
        options={Array.from({ length: 31 }, (_, i) => ({ value: i + 1, label: ordinal(i + 1) }))}
        hint="If you get benefits on a spouse’s or parent’s record, use THEIR birth day."
      />
      <Toggle label="I started getting Social Security before May 1997" checked={s.early} onChange={(v) => set("early", v)} hint="Then you’re paid on the 3rd of each month." />
      <Toggle label="I also receive SSI (Supplemental Security Income)" checked={s.ssi} onChange={(v) => set("ssi", v)} hint="SSI comes on the 1st; Social Security then moves to the 3rd." />
    </>
  );

  const result = (
    <>
      <ResultHero
        label={next ? "Your next payment" : `Your ${s.y} payment day`}
        value={next ? prettyDate(next.date).short : GROUP_LABEL[group].replace(/^./, (c) => c.toUpperCase())}
        sub={
          <>
            You’re paid on the <strong>{GROUP_LABEL[group]}</strong>
            {next ? (
              <>
                {" "}
                — next on <strong>{prettyDate(next.date).weekday}, {prettyDate(next.date).label}</strong>
                {next.month === 1 && s.y === 2027 ? ", the first check with the 3.6% COLA" : ""}.
              </>
            ) : (
              "."
            )}
          </>
        }
      />
      <div className="mt-6 overflow-hidden rounded-2xl">
        <table className="table-sy text-[1.0rem]">
          <thead>
            <tr>
              <th>Payment for</th>
              <th>Social Security arrives</th>
              {s.ssi ? <th>SSI arrives</th> : null}
            </tr>
          </thead>
          <tbody>
            {schedule.map((p, i) => {
              const d = prettyDate(p.date);
              const isNext = next?.date === p.date;
              return (
                <tr key={p.month} className={isNext ? "is-hit" : undefined}>
                  <td className="strong">{monthName(p.month)}</td>
                  <td>
                    {d.weekday.slice(0, 3)}, {d.label.replace(`, ${s.y}`, "").replace(/, \d{4}$/, "")}
                    {p.date.slice(0, 4) !== String(s.y) ? ` (${p.date.slice(0, 4)})` : ""}
                    {p.shifted ? <span className="pill pill-sun ml-2 !py-0 text-[0.78rem]">moved earlier</span> : null}
                  </td>
                  {s.ssi ? (
                    <td>
                      {(() => {
                        const q = ssiSchedule[i];
                        const qd = prettyDate(q.date);
                        return (
                          <>
                            {qd.weekday.slice(0, 3)}, {qd.short}
                            {q.date.slice(0, 4) !== String(s.y) ? ` (${q.date.slice(0, 4)})` : ""}
                          </>
                        );
                      })()}
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {s.ssi || s.early ? (
        <div className="mt-5">
          <Callout tone="sky" title="When the 1st or 3rd falls on a weekend or holiday">
            You’re paid on the business day before. That’s why January SSI often arrives on December 31 — it’s January’s payment,
            not an extra one.
          </Callout>
        </div>
      ) : null}
      <p className="mt-5 text-[0.95rem] text-ink-3">
        No deposit on your date? Social Security asks you to wait three mailing days before contacting them.
      </p>
      <div className="mt-6 border-t border-[var(--hairline)] pt-6">
        <ShareBar tool="payment_schedule" subject={`Our ${s.y} Social Security payment dates`} />
      </div>
    </>
  );

  return <CalculatorShell inputs={inputs} result={result} inputsTitle="Find your dates" mobileSummary={next ? `Next payment: ${prettyDate(next.date).short}` : `Paid on the ${GROUP_LABEL[group]}`} />;
}
