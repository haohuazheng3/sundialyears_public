import type { Metadata } from "next";
import Link from "next/link";
import { ToolHero } from "@/components/tool/ToolHero";
import { ContentSection, ProseCard } from "@/components/tool/CalculatorShell";
import { Faq, type FaqItem } from "@/components/tool/Faq";
import { SourceList } from "@/components/tool/SourceList";
import { RelatedTools } from "@/components/tool/RelatedTools";
import { Feedback } from "@/components/tool/Feedback";
import { AdSlot } from "@/components/tool/AdSlot";
import { StatusChip } from "@/components/tool/StatusChip";
import { JsonLd } from "@/components/site/JsonLd";
import { ColaCheckCalculator } from "@/components/reference/numbers/ColaCheckCalculator";
import { ColaHistoryChart } from "@/components/reference/numbers/ColaHistoryChart";
import {
  averageOfLast,
  colaCheck,
  colaHistory,
  compoundOfLast,
  holdHarmlessBreakEven,
  lastLargerThanLatest,
  minColaOnDeductedPremium,
  zeroColaYears,
  type MedicareRates,
} from "@/components/reference/numbers/cola-math";
import { calculatorLd, pageMetadata } from "@/lib/seo";
import { toolBySlug } from "@/lib/tools";
import { fraForCohort } from "@/lib/calc/ss-core";
import { longDate, money, money2 } from "@/lib/format";
import { SITE } from "@/lib/site";
import { SRC } from "@/data/params/sources";
import { AVG_BENEFITS, COLA, COLA_2027_CPIW, MAX_BENEFIT_2027, SS_YEAR, TR_ECON } from "@/data/params/social-security";
import { IRMAA_2026, IRMAA_2027, PART_B } from "@/data/params/medicare";
import { SS_TAX_THRESHOLDS, SS_WITHHOLDING_RATES } from "@/data/params/tax";
import {
  COLA_1999,
  COLA_2027_DATES,
  COLA_NOTICES_2027,
  CPIW_Q3_MONTHLY,
  MAX_BENEFIT_2026,
  MAX_EXAMPLE_AGE62,
  NEXT_COLA,
  SRC_EXTRA,
  SS_BENEFIT_TAXABLE_SHARE,
  SSI_ESSENTIAL_PERSON_2027,
  SSI_RESOURCE_LIMITS,
  TRUSTEES_COLA_ASSUMPTION,
} from "@/data/params/numbers-extra";
import { COLA_BY_EFFECTIVE_YEAR } from "@/data/generated/cola-history";

const SLUG = "social-security-cola";
const ageOf = (k: string) => Number(k.replace("age", ""));

/* ---------- every figure on this page comes from the params ---------- */
const C = COLA[2027].value;
const C26 = COLA[2026].value;
const D = COLA_2027_DATES.value;
const CPIW = COLA_2027_CPIW.value;
const SS26 = SS_YEAR[2026].value;
const SS27 = SS_YEAR[2027].value;
const B26 = PART_B[2026].value;
const B27 = PART_B[2027];
const B_UP = Math.round((B27.value.premium - B26.premium) * 100) / 100;
const AVG = AVG_BENEFITS.value;
const RETIRED = AVG[0];
const RATES: MedicareRates = {
  partBNow: B26.premium,
  partBNext: B27.value.premium,
  irmaaBNow: IRMAA_2026.partBAddOn,
  irmaaBNext: IRMAA_2027.partBAddOn,
  irmaaDNow: IRMAA_2026.partDAddOn,
  irmaaDNext: IRMAA_2027.partDAddOn,
};
/** What the average retiree keeps after the projected Part B increase. */
const AVG_NET = colaCheck({ benefit: RETIRED.jan2027Before, colaPct: C, situation: "std", partDIrmaa: false, rates: RATES });
/**
 * Hold-harmless only protects people whose premium is deducted from the check, so their benefit is at least the premium.
 * The smallest raise anyone paying the full standard premium can get is the COLA on a benefit equal to that premium.
 */
const MIN_COLA_FULL_PREMIUM = minColaOnDeductedPremium(B26.premium, C);
const STD_PAYERS_PROTECTED = MIN_COLA_FULL_PREMIUM < B_UP;
const HH_BREAK_EVEN = holdHarmlessBreakEven(B26.premium, B27.value.premium, C);

const HISTORY = colaHistory(COLA_BY_EFFECTIVE_YEAR, { 1999: COLA_1999.value });
const AVG10 = averageOfLast(HISTORY, 10);
const AVG20 = averageOfLast(HISTORY, 20);
const GROWTH10 = compoundOfLast(HISTORY, 10);
const BIGGER = lastLargerThanLatest(HISTORY);
const ZEROS = zeroColaYears(HISTORY.slice(-20));
const FIRST = HISTORY[0];
const p1 = (n: number) => `${(Math.round(n * 10) / 10).toFixed(1)}%`;

const FRA_2027 = fraForCohort(1960).label; // a worker turning 67 in January 2027 was born in 1960
/** SSA's 2026 example worker (born 1959) had a full retirement age below 67, so the 2026 "67" figure includes delayed credits. */
const FRA_1959 = fraForCohort(1959);
const MONTHS_PAST_FRA_AT_67_IN_2026 = ageOf("age67") * 12 - FRA_1959.total;
const MAX_AGES = ["age62", "age65", "age66", "age67", "age70"] as const;
const RATES_W4V = SS_WITHHOLDING_RATES.value.map((r) => `${Math.round(r * 100)}%`);

const TITLE = `2027 Social Security COLA: ${C}% Raise & Your New Check`;
const DESC = `The 2027 Social Security COLA is ${C}%, paid from January 2027. See your new check after the Part B premium, plus 2027 average, maximum and SSI amounts.`;

export const metadata: Metadata = pageMetadata({ title: TITLE, description: DESC, path: `/${SLUG}` });

const FAQ: FaqItem[] = [
  {
    q: "What is the Social Security COLA for 2027?",
    a: `It is ${C}%. The Social Security Administration announced it on ${longDate(D.announced)}. It applies to benefits for ${D.effectiveMonth}, which are paid in ${D.firstPaidMonth}, and Supplemental Security Income (SSI) recipients get it first, in the payment dated ${longDate(D.ssiFirstPaid)}. Last year's COLA was ${C26}%.`,
  },
  {
    q: "How much will my Social Security check go up in 2027?",
    a: `Your benefit before deductions rises ${C}%. For the average retired worker that is ${money(RETIRED.jan2027After - RETIRED.jan2027Before)} a month, from ${money(RETIRED.jan2027Before)} to ${money(RETIRED.jan2027After)}. If Medicare Part B comes out of your check, the projected ${money2(B_UP)} premium increase takes part of it, leaving the average retiree about ${money(AVG_NET.netRaise)} more per month.`,
  },
  {
    q: "Is the 2027 Medicare Part B premium final?",
    a: `Not yet. ${money2(B27.value.premium)} a month is the 2026 Medicare Trustees Report projection, up from ${money2(B26.premium)} in 2026. Medicare announces the official premium in November, and your December COLA notice will show the exact amount Social Security will deduct starting in January.`,
  },
  {
    q: "Do I get the COLA if I haven't started Social Security yet?",
    a: "Yes. Every COLA from the year you turn 62 is built into your primary insurance amount, the benefit you'd get at full retirement age, even if you haven't claimed. Waiting doesn't cost you any COLAs, so the 2027 raise counts toward the larger check you'll get when you do start.",
  },
  {
    q: "When will I get my 2027 COLA notice?",
    a: `If you had a my Social Security account by ${longDate(COLA_NOTICES_2027.value.onlineEnrollBy)}, the notice appears in its Message Center in ${COLA_NOTICES_2027.value.online}. Paper letters go out by mail in ${COLA_NOTICES_2027.value.mail}. The notice shows your new benefit and the Medicare premium that will be deducted, so keep it with your tax papers.`,
  },
  {
    q: "When will the 2028 COLA be announced?",
    a: `In ${NEXT_COLA.value.announceMonth}, the day the Bureau of Labor Statistics releases September's inflation report. The 2028 COLA will compare average CPI-W for ${NEXT_COLA.value.cpiwMonths} with the ${CPIW.q3_2026} average behind this year's raise. Nobody knows the number yet; the Trustees assume about ${TR_ECON.value.colaAssumptionAfter2027}%.`,
  },
  {
    q: `Why does SSA's own table list the ${C}% COLA under 2026?`,
    a: `SSA's history table labels each COLA by the month it takes effect, ${D.effectiveMonth}, while news stories and SSA's fact sheets name it after the year it first appears in checks. Both describe the same ${C}% raise. Our chart lets you switch between the two labels.`,
  },
];

export default function Page() {
  const tool = toolBySlug(SLUG)!;
  return (
    <>
      <JsonLd
        data={calculatorLd({
          name: "2027 Social Security COLA calculator",
          description: `Estimate your Social Security payment after the ${C}% 2027 COLA and the 2027 Medicare Part B premium.`,
          path: `/${SLUG}`,
        })}
      />
      <ToolHero
        crumbs={[{ name: "2027 COLA", path: `/${SLUG}` }]}
        eyebrow="Key numbers"
        icon="spark"
        title={
          <>
            The 2027 Social Security COLA is <span className="italic font-normal text-sun-ink">{C}%</span>
          </>
        }
        lead={
          <p>
            Social Security and SSI checks rise {C}% for 2027. SSA announced the cost-of-living adjustment (COLA) on {longDate(D.announced)}; it first shows up in{" "}
            {D.firstPaidMonth} payments, and SSI recipients get it on {longDate(D.ssiFirstPaid)}. Enter your benefit below to see your new check after Medicare’s
            Part B premium.
          </p>
        }
        chips={
          <>
            <StatusChip status={COLA[2027].status}>
              {C}% COLA: {COLA[2027].status === "official" ? "official" : "projected"}
            </StatusChip>
            <StatusChip status={B27.status}>2027 Part B premium: {B27.status === "official" ? "official" : "projected"}</StatusChip>
          </>
        }
      />

      <ColaCheckCalculator />

      <AdSlot />

      <ContentSection className="mt-16 space-y-10">
        <ProseCard>
          <h2>How much will Social Security increase in 2027?</h2>
          <p className="answer">
            Social Security and SSI benefits rise {C}% in 2027. For the average retired worker that’s {money(RETIRED.jan2027After - RETIRED.jan2027Before)} a month
            more, from {money(RETIRED.jan2027Before)} to {money(RETIRED.jan2027After)}, by SSA’s estimate. After the projected increase in the Medicare Part B
            premium, the typical retiree’s deposit grows by about {money(AVG_NET.netRaise)}.
          </p>
          <p>
            The raise is a percentage, so bigger checks get bigger raises. Here are SSA’s estimates of average benefits just before and just after the COLA:
          </p>
          <div className="not-prose overflow-x-auto">
            <table className="table-sy mt-2 text-[1rem]">
              <caption className="sr-only">Estimated average monthly Social Security benefits, January 2027, before and after the {C}% COLA</caption>
              <thead>
                <tr>
                  <th scope="col">Who</th>
                  <th scope="col">Before</th>
                  <th scope="col">After {C}%</th>
                  <th scope="col">Raise</th>
                </tr>
              </thead>
              <tbody>
                {AVG.map((r) => (
                  <tr key={r.type}>
                    <td className="strong">{r.type}</td>
                    <td>{money(r.jan2027Before)}</td>
                    <td>{money(r.jan2027After)}</td>
                    <td>+{money(r.jan2027After - r.jan2027Before)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2>When does the 2027 COLA show up in my check?</h2>
          <p className="answer">
            The {C}% raise applies to benefits for {D.effectiveMonth}, which Social Security pays in {D.firstPaidMonth} — so your first bigger payment is your{" "}
            {D.firstPaidMonth} payment. SSI recipients see it first: their January payment arrives on {longDate(D.ssiFirstPaid)}, because New Year’s Day is a holiday.
          </p>
          <p>
            Your personal notice comes before the money. If you had a <em>my Social Security</em> account by {longDate(COLA_NOTICES_2027.value.onlineEnrollBy)}, it
            appears in the account’s Message Center in {COLA_NOTICES_2027.value.online}; paper letters go out by mail in {COLA_NOTICES_2027.value.mail}. Keep it — it’s
            the only place that shows your exact new benefit and the exact Medicare amount being withheld.
          </p>

          <h2>How was the {C}% COLA calculated?</h2>
          <p className="answer">
            SSA compares average inflation for July, August and September 2026 with the same months of 2025, using the Consumer Price Index for Urban Wage Earners
            and Clerical Workers (CPI-W). The averages were {CPIW.q3_2026} and {CPIW.q3_2025} — an increase of {C}% after rounding to the nearest tenth.
          </p>
          <div className="not-prose overflow-x-auto">
            <table className="table-sy mt-2 text-[1rem]">
              <caption className="sr-only">CPI-W values used for the 2027 COLA</caption>
              <thead>
                <tr>
                  <th scope="col">CPI-W</th>
                  <th scope="col">July</th>
                  <th scope="col">August</th>
                  <th scope="col">September</th>
                  <th scope="col">Average</th>
                </tr>
              </thead>
              <tbody>
                {([2026, 2025] as const).map((y) => (
                  <tr key={y} className={y === 2026 ? "is-hit" : undefined}>
                    <td className="strong">{y}</td>
                    {CPIW_Q3_MONTHLY.value[y].map((v, i) => (
                      <td key={i}>{v}</td>
                    ))}
                    <td className="strong">{y === 2026 ? CPIW.q3_2026 : CPIW.q3_2025}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            The math: ({CPIW.q3_2026} − {CPIW.q3_2025}) ÷ {CPIW.q3_2025} × 100 = {C}%. It’s a formula written into the Social Security Act, not a decision anyone
            makes. For perspective, the Social Security Trustees had assumed {TRUSTEES_COLA_ASSUMPTION.value.dec2026Assumed}% in their report of {longDate(SRC.ssaTrustees2026.published ?? SITE.dataVerifiedOn)} — prices
            for workers rose faster than expected.
          </p>

          <h2>How much of the raise will Medicare take?</h2>
          <p className="answer">
            For most people, about {money2(B_UP)} a month. The Medicare Trustees project the 2027 Part B premium at {money2(B27.value.premium)}, up from{" "}
            {money2(B26.premium)} this year, and Social Security deducts it from your check before paying you. Medicare announces the official premium in
            November.
          </p>
          <p>
            <StatusChip status={B27.status}>{money2(B27.value.premium)} is projected</StatusChip> Until the Centers for Medicare &amp; Medicaid Services (CMS)
            publishes the real number, budget with the projection. Three groups see something different:
          </p>
          <ul>
            <li>
              <strong>Some small checks are protected.</strong> The hold-harmless rule says your Part B premium can’t rise by more than your COLA in dollars, so
              your payment never shrinks — but only if the premium is taken out of your check.{" "}
              {STD_PAYERS_PROTECTED ? (
                <>
                  With a {C}% COLA and a {money2(B_UP)} increase, it caps the premium for checks between {money2(B26.premium)} and about {money(HH_BREAK_EVEN)} a
                  month, and for many people who already pay a reduced premium.
                </>
              ) : (
                <>
                  If you pay the full {money2(B26.premium)}, your check is at least that big, so your {C}% raise is at least {money2(MIN_COLA_FULL_PREMIUM)} — more
                  than the projected {money2(B_UP)} increase, and the rule won’t change your premium. It matters in 2027 only if an earlier year left you paying a
                  reduced premium: pick “Less than that” in the calculator above to see whether it caps yours.
                </>
              )}
            </li>
            <li>
              <strong>Higher-income retirees aren’t.</strong> If you pay the income-related monthly adjustment amount (IRMAA), hold-harmless doesn’t apply, and your
              {IRMAA_2027.premiumYear} surcharge is based on your {IRMAA_2027.magiTaxYear} tax return. A one-time Roth conversion or home sale in{" "}
              {IRMAA_2027.magiTaxYear} can take far more than the COLA gives. Check your tier
              with the <Link href="/irmaa-calculator?year=2027">IRMAA calculator</Link>.
            </li>
            <li>
              <strong>Medicaid or a Medicare Savings Program pays your premium?</strong> Then nothing comes out of your check, and you keep the whole raise.
            </li>
          </ul>

          <h2>What are the maximum Social Security benefits in 2027?</h2>
          <p className="answer">
            A top earner retiring in January 2027 at full retirement age ({FRA_2027}) gets {money(MAX_BENEFIT_2027.value.age67)} a month; claiming at 62 pays{" "}
            {money(MAX_BENEFIT_2027.value.age62)} and waiting until 70 pays {money(MAX_BENEFIT_2027.value.age70)}. These assume earnings at or above the taxable
            maximum — {money(SS27.taxableMax)} in 2027 — for an entire career.
          </p>
          <div className="not-prose overflow-x-auto">
            <table className="table-sy mt-2 text-[1rem]">
              <caption className="sr-only">Maximum monthly Social Security benefit by starting age, SSA examples</caption>
              <thead>
                <tr>
                  <th scope="col">Start at</th>
                  <th scope="col">Started Jan 2026</th>
                  <th scope="col">Same person in 2027</th>
                  <th scope="col">Starting Jan 2027</th>
                </tr>
              </thead>
              <tbody>
                {MAX_AGES.map((k) => (
                  <tr key={k}>
                    <td className="strong">{ageOf(k)}</td>
                    <td>{money(MAX_BENEFIT_2026.value[k])}</td>
                    <td>{money(MAX_BENEFIT_2026.value.in2027AfterCola[k])}</td>
                    <td className="strong">{money(MAX_BENEFIT_2027.value[k])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            SSA’s “{ageOf("age62")}” example starts at {MAX_EXAMPLE_AGE62.value.label}. In 2026, 67 was {MONTHS_PAST_FRA_AT_67_IN_2026} months past that worker’s full retirement age (
            {FRA_1959.label}), so the {money(MAX_BENEFIT_2026.value.age67)} includes delayed retirement credits. Notice the middle column too: someone who started at{" "}
            {ageOf("age70")} in 2026 collects {money(MAX_BENEFIT_2026.value.in2027AfterCola.age70)} from January —
            slightly more than a new {ageOf("age70")}-year-old’s {money(MAX_BENEFIT_2027.value.age70)}. The COLA raised everyone already collecting, while each
            new retiree’s benefit depends on their own birth year and earnings record. Either way, there’s no point trying to “time” a claim around COLAs: every one
            from age 62 is added to your benefit whether you’ve claimed or not.
          </p>

          <h2>What are the 2027 SSI payment amounts?</h2>
          <p className="answer">
            The maximum federal Supplemental Security Income payment rises to {money(SS27.ssiIndividual)} a month for an individual and {money(SS27.ssiCouple)}{" "}
            for a couple, up from {money(SS26.ssiIndividual)} and {money(SS26.ssiCouple)} in 2026. The new amounts arrive first in the payment dated{" "}
            {longDate(D.ssiFirstPaid)}; the amount for an essential person is {money(SSI_ESSENTIAL_PERSON_2027.value)}.
          </p>
          <p>
            Many states add a supplement on top. The SSI resource limits — {money(SSI_RESOURCE_LIMITS.value.individual)} for one person,{" "}
            {money(SSI_RESOURCE_LIMITS.value.couple)} for a couple — are written into law and never rise with inflation, so they don’t change for 2027.
          </p>

          <h2>How does {C}% compare with past COLAs?</h2>
          <p className="answer">
            It’s above the 10-year average of {p1(AVG10)} and the largest raise since the {BIGGER ? `${BIGGER.pct}% COLA paid in ${BIGGER.paidYear}` : "record"}.
            Over the last 20 years, COLAs averaged just {p1(AVG20)}, and in {ZEROS.length} of those years retirees got no raise at all because prices were no
            higher than at the last COLA.
          </p>
        </ProseCard>

        <div className="mx-auto max-w-[860px]">
          <ColaHistoryChart />
        </div>

        <ProseCard>
          <p>
            Compounded, the last ten COLAs raised a benefit by {p1(GROWTH10 * 100)} — a {money(1000)} check in {HISTORY[HISTORY.length - 10].paidYear - 1} is{" "}
            {money(1000 * (1 + GROWTH10))} in {HISTORY[HISTORY.length - 1].paidYear}. The zero years (
            {ZEROS.map((z) => z.paidYear).join(", ")}) followed periods when prices fell. Automatic COLAs began in {FIRST.effectiveYear}; until{" "}
            {HISTORY.find((r) => r.effectiveMonth === "December")!.effectiveYear} they took effect each June.
          </p>
          <p>
            A labeling trap: SSA’s own history table lists this raise under {HISTORY[HISTORY.length - 1].effectiveYear}, the year it takes effect, while the news
            calls it the “{HISTORY[HISTORY.length - 1].paidYear} COLA.” If you compare numbers from different websites, check which convention they use.
          </p>

          <h2>When will the 2028 COLA be announced?</h2>
          <p className="answer">
            In {NEXT_COLA.value.announceMonth}, when September’s inflation figures come out — nobody can know it before then. The 2028 COLA will compare average
            CPI-W for{" "}
            {NEXT_COLA.value.cpiwMonths} with this year’s {CPIW.q3_2026}. The Trustees assume about {TR_ECON.value.colaAssumptionAfter2027}%, but that’s a planning
            assumption, not a forecast.
          </p>
          <p>
            The same announcement will set {NEXT_COLA.value.alsoAnnounced}. Until then, ignore anyone quoting a precise 2028 COLA months in advance — the Trustees’
            own {TRUSTEES_COLA_ASSUMPTION.value.dec2026Assumed}% guess for this year missed by almost a full point.
          </p>

          <h2>What should you do about the 2027 COLA?</h2>
          <p className="answer">
            Budget with your new deposit, not the {C}% headline, and read the Medicare line on your December notice. Then check three things: whether an IRMAA
            surcharge still matches your income, whether the raise makes more of your benefit taxable, and — if you still work — whether you’ll pass the earnings
            limit. Here’s what we’d do:
          </p>
          <ul>
            <li>
              <strong>Budget with the deposit, not the headline.</strong> The average retiree’s benefit rises {money(RETIRED.jan2027After - RETIRED.jan2027Before)},
              but the deposit rises about {money(AVG_NET.netRaise)}. Run your own number above.
            </li>
            <li>
              <strong>Open the December notice and read the Medicare line.</strong> If it shows an IRMAA surcharge and your income has since dropped — you retired,
              lost a spouse, or stopped working — file Form SSA-44 to ask Social Security to use your newer income.
            </li>
            <li>
              <strong>Check your tax withholding.</strong> Part of your benefit becomes taxable once “provisional income” passes{" "}
              {money(SS_TAX_THRESHOLDS.value.base.single)} (single) or {money(SS_TAX_THRESHOLDS.value.base.mfj)} (married filing jointly), and up to{" "}
              {SS_BENEFIT_TAXABLE_SHARE.value.aboveAdjusted}% above {money(SS_TAX_THRESHOLDS.value.adjusted.single)} or{" "}
              {money(SS_TAX_THRESHOLDS.value.adjusted.mfj)} — thresholds that have never been raised for inflation. Form W-4V lets you withhold{" "}
              {RATES_W4V.slice(0, -1).join(", ")} or {RATES_W4V[RATES_W4V.length - 1]} from each check. See whether yours crosses a line with the{" "}
              <Link href="/taxable-social-security-calculator">Social Security tax calculator</Link>.
            </li>
            <li>
              <strong>Still working before full retirement age?</strong> The earnings limit rises to {money(SS27.retUnderFraAnnual)} in 2027. Test your plans with
              the <Link href="/social-security-earnings-limit-calculator?year=2027">earnings limit calculator</Link>.
            </li>
            <li>
              <strong>Don’t plan on {C}% again.</strong> Use something closer to the Trustees’ {TR_ECON.value.colaAssumptionAfter2027}% for future years, and
              remember COLAs track worker prices, which don’t always match what retirees spend on health care and housing.
            </li>
          </ul>
          <p>
            The most common mistake we see: people who delay benefits worry they’re “missing” COLAs. They aren’t. Once you turn 62, every COLA is added to your
            benefit base whether you’ve claimed or not. Compare claiming ages with the{" "}
            <Link href="/social-security-break-even-calculator">break-even calculator</Link>, and see every 2027 figure in our{" "}
            <Link href="/retirement-numbers-2027">2027 retirement numbers</Link> table.
          </p>
        </ProseCard>

        <Faq items={FAQ} />
        <SourceList
          sources={[
            SRC.ssaCola2027,
            SRC.ssaPress20261014,
            SRC.ssaLatestCola,
            SRC.ssaColaSeries,
            SRC_EXTRA.ssaColaApplication,
            SRC_EXTRA.ssaColaSummary,
            SRC_EXTRA.ssaColaInfo,
            SRC_EXTRA.ssaSsiAmounts,
            SRC.ssaMaxBenefit,
            SRC.cms2026Premiums,
            SRC.medicareTrustees2026,
            SRC.fr2026PartB,
            SRC.ssaTrustees2026,
            SRC.irsPub915,
          ]}
        />
        <Feedback />
        <RelatedTools slugs={tool.next} />
      </ContentSection>
    </>
  );
}
