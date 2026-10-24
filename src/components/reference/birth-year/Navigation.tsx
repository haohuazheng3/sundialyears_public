import Link from "next/link";
import { Icon, type AnyIcon } from "@/components/ui/Icon";
import { fraForCohort } from "@/lib/calc/ss-core";
import { rmdApplicableAge } from "@/lib/calc/rmd";
import {
  AGE_DRC_STOP,
  AGE_EARLY,
  BIRTH_YEAR_FIRST,
  BIRTH_YEAR_LAST,
  BIRTH_YEARS,
  type BirthYearProfile,
  birthYearProfile,
  cohortTags,
  phaseOf,
  type Phase,
} from "./timeline";

const HUB = "/social-security-by-birth-year";
export const yearHref = (y: number) => `${HUB}/${y}`;

/** Previous / next birth year, plus the hub. */
export function YearNav({ year }: { year: number }) {
  const prev = year > BIRTH_YEAR_FIRST ? year - 1 : null;
  const next = year < BIRTH_YEAR_LAST ? year + 1 : null;
  return (
    <nav aria-label="Other birth years" className="grid gap-3 sm:grid-cols-3">
      {prev ? (
        <Link href={yearHref(prev)} className="float-soft flex min-h-[3.5rem] items-center gap-2 px-5 py-3 font-bold text-ink hover:text-sun-ink">
          <Icon name="arrow" size={18} className="rotate-180" /> Born in {prev}
        </Link>
      ) : (
        <span aria-hidden="true" />
      )}
      <Link href={HUB} className="float-soft flex min-h-[3.5rem] items-center justify-center gap-2 px-5 py-3 font-bold text-ink hover:text-sun-ink">
        <Icon name="calendar" size={18} /> All birth years
      </Link>
      {next ? (
        <Link href={yearHref(next)} className="float-soft flex min-h-[3.5rem] items-center justify-end gap-2 px-5 py-3 font-bold text-ink hover:text-sun-ink">
          Born in {next} <Icon name="arrow" size={18} />
        </Link>
      ) : (
        <span aria-hidden="true" />
      )}
    </nav>
  );
}

const GROUPS: { title: string; blurb: string; phases: Phase[] }[] = [
  {
    title: `Already ${AGE_DRC_STOP} or turning ${AGE_DRC_STOP}`,
    blurb: "Every claiming deadline has passed (or passes this year). RMDs and Medicare costs are what’s left to manage.",
    phases: ["past70", "turning70"],
  },
  { title: `Between ${AGE_EARLY} and ${AGE_DRC_STOP}`, blurb: "The claiming decision is live: each year you wait raises your check for life.", phases: ["fraTo70", "reachingFra", "62toFra"] },
  {
    title: `Not yet ${AGE_EARLY}`,
    blurb: `Time to plan: your full retirement age is ${fraForCohort(BIRTH_YEAR_LAST).label} and your RMDs start at ${rmdApplicableAge({ year: BIRTH_YEAR_LAST, month: 6, day: 15 })}.`,
    phases: ["before62"],
  },
];

/** Year cards for the hub, grouped by where each cohort stands in `refYear`. */
export function YearGrid({ refYear }: { refYear: number }) {
  const profiles = BIRTH_YEARS.map((y) => birthYearProfile(y, refYear));
  return (
    <div className="space-y-10">
      {GROUPS.map((g) => {
        const list = profiles.filter((p) => g.phases.includes(phaseOf(p)));
        if (!list.length) return null;
        return (
          <section key={g.title} aria-labelledby={`grp-${g.phases[0]}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
              <h2 id={`grp-${g.phases[0]}`} className="text-[1.6rem] font-semibold">
                {g.title}{" "}
                <span className="text-[1.05rem] font-normal text-ink-3">
                  (born {list[0].year}–{list[list.length - 1].year})
                </span>
              </h2>
            </div>
            <p className="mt-1 px-1 text-[1.0625rem] text-ink-2">{g.blurb}</p>
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {list.map((p) => (
                <li key={p.year}>
                  <YearCard p={p} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function YearCard({ p }: { p: BirthYearProfile }) {
  // The card already prints the age reached this year, so skip the "Turns N in YYYY" tags.
  const tags = cohortTags(p.year, p.refYear)
    .filter((t) => !t.startsWith("Turns "))
    .slice(0, 2);
  return (
    <Link href={yearHref(p.year)} prefetch={false} className="float float-lift group flex h-full flex-col p-4 sm:p-5">
      <span className="font-display text-[1.9rem] font-semibold leading-none text-ink">{p.year}</span>
      <span className="mt-2 text-[0.98rem] text-ink-2">
        Full retirement age <strong className="text-ink">{p.fra.label}</strong>
      </span>
      <span className="text-[0.95rem] text-ink-3">
        Turns {p.ageInRefYear.after} in {p.refYear}
      </span>
      {tags.length ? (
        <span className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span key={t} className="pill pill-sun !px-2 !py-0.5 text-[0.78rem] leading-snug">
              {t}
            </span>
          ))}
        </span>
      ) : null}
      <span className="mt-auto inline-flex items-center gap-1 pt-3 text-[0.95rem] font-bold text-sun-ink">
        See dates <Icon name="arrow" size={16} className="transition-transform group-hover:translate-x-1" />
      </span>
    </Link>
  );
}

/** "Run your own numbers" — outbound links with the URL-contract params prefilled for a mid-year birthday. */
export function RunNumbers({ p }: { p: BirthYearProfile }) {
  const dob = `${p.year}-6-15`;
  const fraPassedBy = Math.max(...p.fraYears.map((g) => g.year));
  const links: { href: string; icon: AnyIcon; title: string; sub: string }[] = [
    { href: `/social-security-break-even-calculator?dob=${dob}`, icon: "clock", title: "When should I claim?", sub: "Your monthly check and lifetime total at 62, full retirement age and 70" },
    ...(fraPassedBy >= p.refYear && p.age62Year <= p.refYear + 1
      ? [{ href: `/social-security-earnings-limit-calculator?dob=${dob}&year=${p.refYear}`, icon: "work" as const, title: "Still working?", sub: "What the earnings test would withhold" }]
      : []),
    { href: `/rmd-calculator?dob=${dob}`, icon: "rmd", title: "My required minimum distribution", sub: "The amount, the deadline and the IRS table math" },
    ...(p.age65Year <= p.refYear + 1
      ? [{ href: "/medicare-premium-calculator", icon: "medicare" as const, title: "My Medicare premiums", sub: "Part B and Part D, including IRMAA" }]
      : []),
    ...(p.age65Year <= p.refYear
      ? [{ href: `/taxable-social-security-calculator?age65=1`, icon: "tax" as const, title: "Is my Social Security taxable?", sub: "With the senior deduction built in" }]
      : []),
    { href: `/full-retirement-age?dob=${dob}#fra-finder`, icon: "calendar", title: "Use my exact birthday", sub: "Your full retirement age month, to the day" },
  ];
  return (
    <section aria-labelledby="run-h" className="float p-6 sm:p-7">
      <h2 id="run-h" className="flex items-center gap-2 text-[1.45rem] font-semibold">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-sun-wash text-sun-ink">
          <Icon name="spark" size={16} />
        </span>
        Run your own numbers
      </h2>
      <p className="mt-2 text-[1rem] leading-relaxed text-ink-3">
        Calculators that ask for a birth date open with June 15, {p.year} filled in — change it to yours.
      </p>
      <ul className="mt-4 space-y-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="sunk group flex min-h-[3.5rem] items-start gap-3 p-3.5 hover:bg-[var(--card-2)]">
              <Icon name={l.icon} size={20} className="mt-0.5 shrink-0 text-sun-ink" />
              <span className="min-w-0">
                <span className="block font-bold text-ink">{l.title}</span>
                <span className="mt-0.5 block text-[0.95rem] leading-snug text-ink-3">{l.sub}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
