import Link from "next/link";
import type { Metadata } from "next";
import { Icon } from "@/components/ui/Icon";
import { StatusChip } from "@/components/tool/StatusChip";
import { JsonLd } from "@/components/site/JsonLd";
import { Faq } from "@/components/tool/Faq";
import { BirthYearJump } from "@/components/site/BirthYearJump";
import { CALCULATORS, TOOL_GROUPS, toolBySlug } from "@/lib/tools";
import { KEY_DATES } from "@/data/calendar";
import { SS } from "@/data/params";
import { IRMAA_2027, PART_B } from "@/data/params/medicare";
import { SITE } from "@/lib/site";
import { organizationLd, websiteLd, pageMetadata } from "@/lib/seo";
import { money, moneySmart, longDate } from "@/lib/format";

export const metadata: Metadata = pageMetadata({
  title: `${SITE.name} — Free Retirement Calculators Built on the Official 2027 Numbers`,
  description:
    "When to claim Social Security, your RMD, IRMAA brackets, the earnings test, taxes on benefits and Medicare premiums — free calculators updated with SSA, CMS and IRS figures, every source linked.",
  path: "/",
});

const QUESTIONS: { q: string; slug: string }[] = [
  { q: "When should I start Social Security?", slug: "social-security-break-even-calculator" },
  { q: "How much do I have to take out of my IRA this year?", slug: "rmd-calculator" },
  { q: "Will my income push my Medicare premium up?", slug: "irmaa-calculator" },
  { q: "I’m still working — will Social Security hold back my checks?", slug: "social-security-earnings-limit-calculator" },
  { q: "How much of my Social Security will be taxed?", slug: "taxable-social-security-calculator" },
  { q: "What will Medicare cost us next year?", slug: "medicare-premium-calculator" },
  { q: "I inherited an IRA. What do I have to withdraw?", slug: "inherited-ira-rmd-calculator" },
  { q: "Does my state tax my retirement income?", slug: "state-retirement-taxes" },
];

const HOME_FAQ = [
  {
    q: "Are these calculators really free?",
    a: "Yes. There is no sign-up and nothing to buy. The site is supported by advertising. Your inputs stay in your browser — we don’t ask for your name, Social Security number or account numbers.",
  },
  {
    q: "Where do your numbers come from?",
    a: "Only from primary sources: the Social Security Administration, CMS and Medicare.gov, the IRS, the Federal Register and eCFR, and state revenue departments. Every page lists the exact documents it relies on, and each figure is marked Official or Projected.",
  },
  {
    q: "Why do some 2027 numbers say “Projected”?",
    a: "Some agencies publish next year’s figures later than others. SSA released the 2027 COLA on October 14, 2026, but CMS normally announces the 2027 Part B premium and IRMAA brackets in mid-November. Until then we show the Medicare Trustees’ projection, clearly labeled, and replace it the day CMS publishes.",
  },
  {
    q: "Can I use this instead of a financial advisor?",
    a: "These tools give you the official math and explain it, which is often enough to make a confident decision or to ask an advisor better questions. They are not personalized financial, tax or legal advice.",
  },
];

export default function HomePage() {
  const ss27 = SS.SS_YEAR[2027].value;
  const glance = [
    { label: "2027 Social Security COLA", value: "+3.6%", sub: "Starts with January 2027 checks", status: "official" as const, href: "/social-security-cola" },
    { label: "2027 Part B premium", value: moneySmart(PART_B[2027].value.premium), sub: `${moneySmart(PART_B[2026].value.premium)} in 2026 · CMS final due mid-Nov`, status: "projected" as const, href: "/medicare-premium-calculator" },
    { label: "2027 earnings-test limit", value: money(ss27.retUnderFraAnnual), sub: `${money(ss27.retFraYearAnnual)} in the year you reach FRA`, status: "official" as const, href: "/social-security-earnings-limit-calculator" },
    { label: "2027 IRMAA starts above", value: money(IRMAA_2027.individualBounds[0]), sub: `${money(IRMAA_2027.jointBounds[0])} joint · uses your 2025 tax return`, status: "projected" as const, href: "/irmaa-brackets-2027" },
  ];
  const upcoming = KEY_DATES.filter((d) => d.status !== "done").slice(0, 5);

  return (
    <>
      <JsonLd data={[organizationLd(), websiteLd()]} />

      {/* Hero */}
      <section className="mx-auto grid max-w-[1180px] gap-10 px-4 pb-10 pt-12 sm:px-6 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <p className="eyebrow">Free · No sign-up · Every source linked</p>
          <h1 className="mt-5 text-[2.9rem] font-semibold leading-[1.02] sm:text-[4.4rem]">
            Retirement math,
            <br />
            <span className="italic font-normal text-sun-ink">made plain.</span>
          </h1>
          <p className="mt-6 max-w-xl text-[1.25rem] leading-relaxed text-ink-2">
            The decisions that come with a date — when to claim Social Security, how much your RMD is, whether IRMAA will raise
            your Medicare bill — worked out with the official 2027 numbers, and explained like a person would.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/social-security-break-even-calculator" prefetch className="btn btn-primary">
              When to claim Social Security <Icon name="arrow" size={19} />
            </Link>
            <Link href="/rmd-calculator" prefetch className="btn btn-ghost">
              RMD calculator
            </Link>
          </div>
        </div>

        <div className="float rise p-6 sm:p-7" style={{ animationDelay: "80ms" }}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[1.45rem] font-semibold">2027 at a glance</h2>
            <span className="pill">Verified {longDate(SITE.dataVerifiedOn)}</span>
          </div>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {glance.map((g) => (
              <li key={g.label}>
                <Link href={g.href} className="sunk group block h-full p-4 transition-colors hover:bg-[var(--card-2)]">
                  <span className="block text-[0.95rem] font-semibold leading-snug text-ink-3">{g.label}</span>
                  <span className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                    <span className="num font-display text-[2.1rem] font-semibold leading-none text-ink">{g.value}</span>
                    <StatusChip status={g.status} />
                  </span>
                  <span className="mt-2 block text-[0.92rem] leading-snug text-ink-3">{g.sub}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/retirement-numbers-2027" className="mt-5 inline-flex items-center gap-1.5 font-bold text-sun-ink">
            Every 2027 number, with sources <Icon name="arrow" size={18} />
          </Link>
        </div>
      </section>

      {/* Question-first entry */}
      <section id="calculators" className="mx-auto max-w-[1180px] px-4 py-12 sm:px-6">
        <h2 className="text-[2rem] font-semibold sm:text-[2.4rem]">Start with your question</h2>
        <p className="mt-2 max-w-2xl text-[1.125rem] text-ink-2">Each answer opens a calculator that shows the number first, then the rule behind it.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {QUESTIONS.map(({ q, slug }, i) => {
            const t = toolBySlug(slug)!;
            return (
              <Link
                key={slug}
                href={`/${slug}`}
                prefetch
                className="float float-lift group flex min-h-[13rem] flex-col p-6 rise"
                style={{ animationDelay: `${60 + i * 40}ms` }}
              >
                <span className="float-soft grid h-11 w-11 place-items-center text-sun-ink">
                  <Icon name={t.icon} size={21} />
                </span>
                <span className="mt-5 flex-1 font-display text-[1.32rem] font-semibold leading-snug text-ink">{q}</span>
                <span className="mt-4 inline-flex items-center gap-1.5 text-[1rem] font-bold text-sun-ink">
                  {t.navTitle} <Icon name="arrow" size={17} className="transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Birth-year jump + calendar */}
      <section className="mx-auto grid max-w-[1180px] gap-6 px-4 py-12 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="float p-6 sm:p-8">
          <p className="eyebrow">Personal</p>
          <h2 className="mt-3 text-[1.85rem] font-semibold leading-tight">Every date that matters for your birth year</h2>
          <p className="mt-3 text-[1.0625rem] leading-relaxed text-ink-2">
            Full retirement age, the month you can first claim, when Medicare starts, the year your RMDs begin, and how much
            claiming early or late changes your check.
          </p>
          <BirthYearJump />
          <Link href="/full-retirement-age" className="mt-5 inline-flex items-center gap-1.5 font-bold text-sun-ink">
            Full retirement age chart <Icon name="arrow" size={18} />
          </Link>
        </div>

        <div className="float p-6 sm:p-8">
          <p className="eyebrow">Coming up</p>
          <h2 className="mt-3 text-[1.85rem] font-semibold leading-tight">The retirement calendar, 2026 → 2027</h2>
          <ol className="mt-6 space-y-1">
            {upcoming.map((d) => (
              <li key={d.title}>
                <Link href={d.href ?? "/"} className="group grid grid-cols-[7.5rem_1fr] gap-4 rounded-2xl p-3 transition-colors hover:bg-sunk sm:grid-cols-[9rem_1fr]">
                  <span className="pt-0.5 text-[0.95rem] font-bold text-sun-ink">{d.date}</span>
                  <span>
                    <span className="block font-bold leading-snug text-ink">{d.title}</span>
                    <span className="mt-1 block text-[0.98rem] leading-snug text-ink-2">{d.detail}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* All calculators — grouped directory (every tool one click from home) */}
      <section className="mx-auto max-w-[1180px] px-4 py-12 sm:px-6" aria-labelledby="all-calcs-h">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="all-calcs-h" className="text-[2rem] font-semibold">All calculators</h2>
          <Link href="/calculators" className="inline-flex items-center gap-1.5 font-bold text-sun-ink">
            Browse by topic <Icon name="arrow" size={18} />
          </Link>
        </div>
        <div className="mt-6 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {TOOL_GROUPS.filter((g) => g !== "Key numbers").map((g) => (
            <div key={g} className="float-soft p-5">
              <p className="eyebrow mb-3">{g}</p>
              <ul className="space-y-1.5">
                {CALCULATORS.filter((t) => t.group === g).map((t) => (
                  <li key={t.slug}>
                    <Link href={`/${t.slug}`} className="flex items-start gap-2 text-[1rem] font-semibold leading-snug text-ink-2 hover:text-ink">
                      <span className="mt-0.5 text-sun-ink">
                        <Icon name={t.icon} size={17} />
                      </span>
                      {t.navTitle}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Trust */}
      <section className="mx-auto max-w-[1180px] px-4 py-12 sm:px-6">
        <div className="float grid gap-8 p-6 sm:p-10 md:grid-cols-3">
          <div className="md:col-span-1">
            <p className="eyebrow">Why trust these numbers</p>
            <h2 className="mt-3 text-[1.85rem] font-semibold leading-tight">We show our work.</h2>
          </div>
          <ul className="grid gap-5 sm:grid-cols-2 md:col-span-2">
            {[
              ["Primary sources only", "SSA, CMS, IRS, the Federal Register and state revenue departments — linked on every page."],
              ["Official vs. projected, labeled", "When an agency hasn’t published a figure yet, we say so and show where the estimate comes from."],
              ["Updated the day rules change", "We watch the agency pages that publish new numbers and re-verify everything when they move."],
              ["The math, not a black box", "Every result has a “Show the math” panel with the exact table values and formulas used."],
            ].map(([t, d]) => (
              <li key={t} className="flex gap-3">
                <span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-sage-wash text-sage">
                  <Icon name="check" size={16} strokeWidth={2.4} />
                </span>
                <span>
                  <span className="block font-bold text-ink">{t}</span>
                  <span className="mt-1 block text-[1rem] leading-relaxed text-ink-2">{d}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-[900px] px-4 py-12 sm:px-6">
        <Faq items={HOME_FAQ} />
      </section>
    </>
  );
}
