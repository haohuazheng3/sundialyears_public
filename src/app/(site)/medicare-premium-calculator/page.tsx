import type { Metadata } from "next";
import Link from "next/link";
import { ToolHero } from "@/components/tool/ToolHero";
import { MedicareCalculator } from "@/components/calculators/medicare/MedicareCalculator";
import { ContentSection, ProseCard } from "@/components/tool/CalculatorShell";
import { Faq, type FaqItem } from "@/components/tool/Faq";
import { SourceList } from "@/components/tool/SourceList";
import { RelatedTools } from "@/components/tool/RelatedTools";
import { Feedback } from "@/components/tool/Feedback";
import { AdSlot } from "@/components/tool/AdSlot";
import { StatusChip } from "@/components/tool/StatusChip";
import { JsonLd } from "@/components/site/JsonLd";
import { calculatorLd, pageMetadata } from "@/lib/seo";
import { toolBySlug } from "@/lib/tools";
import { SRC } from "@/data/params/sources";
import type { Status } from "@/data/params/types";
import { IRMAA_2026, IRMAA_2027, IRMAA_2027_ALT_BOUNDS, PART_A, PART_B, PART_B_REBATE_2026, PART_D, PENALTIES } from "@/data/params/medicare";
import { AVG_PLAN_PREMIUM, PART_A_PENALTY, PART_B_2025, SRC_MEDICARE_EXTRA } from "@/data/params/medicare-extra";
import { COLA, SS_YEAR } from "@/data/params/social-security";
import { holdHarmlessBreakEvenBenefit, partBWithPenalty, partDPenalty, partDPenaltyRaw } from "@/lib/calc/medicare";
import { roundDownToDollar, roundToCents } from "@/lib/calc/dates";
import { money, money2, pct } from "@/lib/format";

const SLUG = "medicare-premium-calculator";

/* ── Every number below comes from src/data/params. ── */
const B26 = PART_B[2026].value;
const B27 = PART_B[2027].value;
const A26 = PART_A[2026].value;
const A27 = PART_A[2027].value;
const D26 = PART_D[2026].value;
const D27 = PART_D[2027].value;
const AVG26 = AVG_PLAN_PREMIUM[2026].value;
const AVG27 = AVG_PLAN_PREMIUM[2027].value;
const B_RISE_2027 = roundToCents(B27.premium - B26.premium);
const B_RISE_2026 = roundToCents(B26.premium - PART_B_2025.value.premium);
const HH_2027 = holdHarmlessBreakEvenBenefit(B_RISE_2027, COLA[2027].value);
const HH_2026 = holdHarmlessBreakEvenBenefit(B_RISE_2026, COLA[2026].value);
const PEN_B = PENALTIES.value.partBPerFull12Months;
const PEN_D = PENALTIES.value.partDPerMonth;
const EX_B = partBWithPenalty(B26.premium, 24); // Medicare.gov's own example: 24 months late in 2026
const EX_B_RAW = roundToCents(B26.premium * (1 + PEN_B * 2));
const EX_D26 = partDPenalty(2026, 17);
const EX_D27 = partDPenalty(2027, 17);
const AVG_WORKER_27 = SS_YEAR[2027].value.avgRetiredWorkerAfterCola;
const REBATE = PART_B_REBATE_2026.value;
const TYPICAL_27 = roundToCents(B27.premium + AVG27.pdp);
const ALT_GAP_27 = IRMAA_2027.individualBounds[1] - IRMAA_2027_ALT_BOUNDS.individualBounds[1];
/** The smallest 2027 COLA raise on a check that can cover the full 2026 premium (a smaller check leaves no payment to protect). */
const MIN_RAISE_27 = roundToCents((B26.premium * COLA[2027].value) / 100);
/** True when that raise already beats the 2027 Part B increase: then only people held harmless in 2026 can be protected in 2027. */
const HH_27_ONLY_CARRYOVER = MIN_RAISE_27 >= B_RISE_2027;

const TITLE = "Medicare Premium Calculator 2027: Part B, Part D & IRMAA";
const DESC = `Estimate your 2026 or 2027 Medicare premiums: Part B (projected ${money2(B27.premium)} in 2027), Part D, IRMAA and late penalties, for one or two people, from CMS data.`;

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESC,
  path: `/${SLUG}`,
});

const FAQ: FaqItem[] = [
  {
    q: "Is the 2027 Part B premium official yet?",
    a: `Not yet. CMS hasn’t announced the 2027 Part B premium. The 2026 Medicare Trustees Report projects ${money2(B27.premium)} a month and a ${money(B27.deductible)} deductible, up from ${money2(B26.premium)} and ${money(B26.deductible)}. CMS usually publishes the official figures in mid-November together with the 2027 IRMAA table, and we’ll update this calculator when it does.`,
  },
  {
    q: "Which year’s income sets my 2027 Medicare premium?",
    a: `Your ${IRMAA_2027.magiTaxYear} tax return. Medicare’s income-related surcharge (IRMAA) uses modified adjusted gross income from two years before the premium year, so 2026 premiums use ${IRMAA_2026.magiTaxYear} income and 2027 premiums use ${IRMAA_2027.magiTaxYear}. If your income dropped because you retired, divorced, were widowed or had another life-changing event, file Form SSA-44 to use a more recent year.`,
  },
  {
    q: "Does Medicare Advantage replace the Part B premium?",
    a: `No. In a Medicare Advantage plan you still pay the Part B premium — ${money2(B26.premium)} standard in 2026 and a projected ${money2(B27.premium)} in 2027 — plus any IRMAA, on top of the plan’s own premium. A “$0 premium” plan only means the plan itself charges nothing extra. Part D IRMAA applies to Advantage drug coverage too.`,
  },
  {
    q: "How is the Part D late-enrollment penalty calculated?",
    a: `Multiply ${pct(PEN_D, 0)} by the national base beneficiary premium and by the number of full months you went without Part D or other creditable drug coverage, then round to the nearest 10 cents. The base is ${money2(D26.baseBeneficiaryPremium)} in 2026 and ${money2(D27.baseBeneficiaryPremium)} in 2027, so 14 uncovered months cost ${money2(partDPenalty(2026, 14))} a month in 2026 and ${money2(partDPenalty(2027, 14))} in 2027.`,
  },
  {
    q: "Who is protected by the hold-harmless rule in 2027?",
    a: HH_27_ONLY_CARRYOVER
      ? `People who got Social Security for November and December 2026 with Part B taken out of their checks, and who don’t pay IRMAA. But a ${COLA[2027].value}% raise on any check that covers the full ${money2(B26.premium)} premium is at least ${money2(MIN_RAISE_27)}, more than the projected ${money2(B_RISE_2027)} increase, so in 2027 the rule only helps people already held harmless in 2026 who pay less than ${money2(B26.premium)}.`
      : `People who got Social Security for November and December 2026 with Part B taken out of their checks, and who don’t pay IRMAA. Their Part B can’t rise by more than their dollar COLA raise. With a ${COLA[2027].value}% COLA and a projected ${money2(B_RISE_2027)} Part B increase, that matters for checks under about ${money(HH_2027)} a month.`,
  },
  {
    q: `Did everyone get the ${money(REBATE.amount)} Medicare rebate?`,
    a: `No. The one-time ${money(REBATE.amount)} Part B premium rebate paid in ${REBATE.month} went to people with Part B in Original Medicare. It excluded Medicare Advantage members, people who pay IRMAA and people whose Part B premium Medicaid pays. It was a single payment from the Medicare Improvement Fund and does not lower the 2026 or 2027 premium itself.`,
  },
  {
    q: "How much is Part A if I don’t have 40 quarters of work?",
    a: `In 2026 Part A costs ${money(A26.premium30to39Quarters)} a month with 30 to 39 quarters of Medicare-covered work and ${money(A26.premiumUnder30Quarters)} with fewer than 30. The Trustees project ${money(A27.premium30to39Quarters)} and ${money(A27.premiumUnder30Quarters)} for 2027. You may get premium-free Part A on a spouse’s record. Signing up late adds ${pct(PART_A_PENALTY.value.rate, 0)} for twice the number of years you delayed.`,
  },
];

/** "$112,001 – $142,000"-style MAGI band for an IRMAA tier. */
function band(bounds: readonly number[], top: number, t: number) {
  if (t === 0) return `${money(bounds[0])} or less`;
  if (t <= 3) return `${money(bounds[t - 1] + 1)} – ${money(bounds[t])}`;
  if (t === 4) return `${money(bounds[3] + 1)} – ${money(top - 1)}`;
  return `${money(top)} or more`;
}

function Chip({ status }: { status: Status }) {
  return status === "official" ? null : <StatusChip status={status} />;
}

const KEY_ROWS: { label: string; a: string; b: string; status: Status }[] = [
  {
    label: "Part B standard premium (monthly)",
    a: money2(B26.premium),
    b: money2(B27.premium),
    status: PART_B[2027].status,
  },
  {
    label: "Part B deductible (yearly)",
    a: money(B26.deductible),
    b: money(B27.deductible),
    status: PART_B[2027].status,
  },
  {
    label: "Part A premium, 40+ quarters",
    a: money(0),
    b: money(0),
    status: "official",
  },
  {
    label: "Part A premium, 30–39 quarters",
    a: money(A26.premium30to39Quarters),
    b: money(A27.premium30to39Quarters),
    status: PART_A[2027].status,
  },
  {
    label: "Part A premium, under 30 quarters",
    a: money(A26.premiumUnder30Quarters),
    b: money(A27.premiumUnder30Quarters),
    status: PART_A[2027].status,
  },
  {
    label: "Part A hospital deductible (per benefit period)",
    a: money(A26.deductible),
    b: money(A27.deductible),
    status: PART_A[2027].status,
  },
  {
    label: "Part D base beneficiary premium (sets penalties)",
    a: money2(D26.baseBeneficiaryPremium),
    b: money2(D27.baseBeneficiaryPremium),
    status: PART_D[2027].status,
  },
  {
    label: "Part D deductible (yearly, maximum)",
    a: money(D26.deductible),
    b: money(D27.deductible),
    status: PART_D[2027].status,
  },
  {
    label: "Part D out-of-pocket cap (yearly)",
    a: money(D26.outOfPocketCap),
    b: money(D27.outOfPocketCap),
    status: PART_D[2027].status,
  },
  {
    label: "Average stand-alone drug plan premium",
    a: money2(AVG26.pdp),
    b: `about ${money(AVG27.pdp)}`,
    status: AVG_PLAN_PREMIUM[2027].status,
  },
  {
    label: "Average Medicare Advantage premium",
    a: money2(AVG26.ma),
    b: money2(AVG27.ma),
    status: AVG_PLAN_PREMIUM[2027].status,
  },
];

export default function Page() {
  const tool = toolBySlug(SLUG)!;
  const s27 = IRMAA_2027;
  return (
    <>
      <JsonLd
        data={calculatorLd({
          name: "Medicare Premium Calculator",
          description: DESC,
          path: `/${SLUG}`,
        })}
      />
      <ToolHero
        crumbs={[{ name: "Medicare Premium Calculator", path: `/${SLUG}` }]}
        eyebrow="Medicare"
        icon="medicare"
        title={
          <>
            Medicare premium calculator for <span className="italic font-normal text-sun-ink">2026 and 2027</span>
          </>
        }
        lead={
          <p>
            The standard Part B premium is projected to rise to {money2(B27.premium)} a month in 2027, from {money2(B26.premium)} in 2026 — and most people add
            a drug or Medicare Advantage plan on top. Enter your income and Social Security below to see your full monthly bill, any income-related surcharge
            (IRMAA) or late penalty, and what’s left of your check.
          </p>
        }
        chips={
          <>
            <StatusChip status="projected">2027 Part B & IRMAA: projected</StatusChip>
            <StatusChip status="official">2026 CMS & 2027 Part D: official</StatusChip>
          </>
        }
      />

      <MedicareCalculator />

      <AdSlot />

      <ContentSection className="mt-16 space-y-10">
        <ProseCard>
          <h2>How much does Medicare cost in 2027?</h2>
          <p className="answer">
            For most people, Medicare in 2027 costs the Part B premium — projected at {money2(B27.premium)} a month, up from {money2(B26.premium)} — plus a drug
            plan or Medicare Advantage premium. Part A stays free if you or your spouse worked about 10 years. Higher incomes add IRMAA; signing up late adds
            penalties.
          </p>
          <p>
            Here is every premium-related number side by side. The 2027 Part D figures are final; the 2027 Part A and Part B figures come from the 2026 Medicare
            Trustees Report until the Centers for Medicare &amp; Medicaid Services (CMS) publishes the official amounts.
          </p>
          <div className="not-prose overflow-x-auto">
            <table className="table-sy mt-4 text-[1rem]">
              <thead>
                <tr>
                  <th scope="col">Item</th>
                  <th scope="col">2026</th>
                  <th scope="col">2027</th>
                </tr>
              </thead>
              <tbody>
                {KEY_ROWS.map((r) => (
                  <tr key={r.label}>
                    <td>{r.label}</td>
                    <td>{r.a}</td>
                    <td className="strong">
                      <span className="flex flex-wrap items-center gap-2">
                        {r.b} <Chip status={r.status} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            <strong>What we’d budget:</strong> about {money2(TYPICAL_27)} a month per person for 2027 — the projected Part B premium plus an average stand-alone
            drug plan — before any IRMAA or penalty. CMS’s final Part B number has landed a few dollars away from the Trustees’ projection before, so leave a
            little room.
          </p>

          <h2>What is the Medicare Part B premium for 2027?</h2>
          <p className="answer">
            CMS hasn’t announced it yet. The 2026 Medicare Trustees Report projects {money2(B27.premium)} a month for 2027, a {money2(B_RISE_2027)} increase
            from 2026’s {money2(B26.premium)}, with the deductible rising from {money(B26.deductible)} to {money(B27.deductible)}. CMS normally publishes the
            official amount in mid-November, and we’ll update this calculator when it does.
          </p>
          <p>
            That {money2(B_RISE_2027)} rise is modest next to 2026’s jump of {money2(B_RISE_2026)} from {money2(PART_B_2025.value.premium)}. With the official{" "}
            {COLA[2027].value}% cost-of-living adjustment (COLA), the average retired worker’s check rises far more than the premium does.
          </p>

          <h2>Who pays more because of their income?</h2>
          <p className="answer">
            If your modified adjusted gross income (MAGI) two years earlier was above {money(IRMAA_2026.individualBounds[0])} (
            {money(IRMAA_2026.jointBounds[0])} joint), you pay an income-related monthly adjustment amount (IRMAA) on Part B and Part D in 2026. For 2027 the
            first line is projected at {money(s27.individualBounds[0])} ({money(s27.jointBounds[0])} joint), based on your {s27.magiTaxYear} return.
          </p>
          <div className="not-prose overflow-x-auto">
            <table className="table-sy mt-4 text-[1rem]">
              <caption className="sr-only">
                Projected 2027 IRMAA tiers by MAGI on the {s27.magiTaxYear} tax return, with monthly Part B and Part D amounts per person
              </caption>
              <thead>
                <tr>
                  <th scope="col">Single MAGI ({s27.magiTaxYear})</th>
                  <th scope="col">Joint MAGI ({s27.magiTaxYear})</th>
                  <th scope="col">2027 Part B</th>
                  <th scope="col">2027 Part D add-on</th>
                  <th scope="col">2026 Part B, same tier</th>
                </tr>
              </thead>
              <tbody>
                {[0, 1, 2, 3, 4, 5].map((t) => (
                  <tr key={t}>
                    <td>{band(s27.individualBounds, s27.topIndividual, t)}</td>
                    <td>{band(s27.jointBounds, s27.topJoint, t)}</td>
                    <td className="strong">{money2(s27.standardPartB + s27.partBAddOn[t])}</td>
                    <td>{t === 0 ? "—" : `+${money2(s27.partDAddOn[t])}`}</td>
                    <td>{money2(IRMAA_2026.standardPartB + IRMAA_2026.partBAddOn[t])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[1rem]">
            <StatusChip status={s27.status} /> 2027 lines use the official inflation formula; the October 2025 price data it needs was never published, so the
            lines above the first could end up {money(ALT_GAP_27)} lower ({money(ALT_GAP_27 * 2)} joint). Amounts are per person, per month.
          </p>
          <p>Three things people get wrong:</p>
          <ul>
            <li>
              <strong>It’s a cliff, not a slope.</strong> One dollar over a line costs the whole next tier for the entire year — for both spouses if you file
              jointly.
            </li>
            <li>
              <strong>Married filing separately is brutal.</strong> If you lived together at any point in the year, anything over{" "}
              {money(IRMAA_2026.mfsThreshold)} in 2026 (a projected {money(s27.mfsThreshold)} in 2027) jumps straight to the second-highest tier.
            </li>
            <li>
              <strong>Retirement is a “life-changing event”.</strong> If your income fell because you stopped working, Form SSA-44 lets Social Security use the
              lower, more recent year instead of waiting two years.
            </li>
          </ul>
          <p>
            Find your exact tier and how much room you have with the <Link href="/irmaa-calculator">IRMAA calculator</Link>, or see the full{" "}
            <Link href="/irmaa-brackets-2027">2027 IRMAA brackets</Link>.
          </p>

          <h2>How do Medicare late-enrollment penalties work?</h2>
          <p className="answer">
            Part B adds {pct(PEN_B, 0)} of the standard premium for every full 12 months you could have had it but didn’t, usually for life. Part D adds{" "}
            {pct(PEN_D, 0)} of the national base premium for every full month without creditable drug coverage. Premium Part A adds{" "}
            {pct(PART_A_PENALTY.value.rate, 0)} for twice the years you delayed.
          </p>
          <ul>
            <li>
              <strong>Part B, Medicare.gov’s own example:</strong> 24 months late in 2026 is two full years, so {pct(PEN_B * 2, 0)}: {money2(B26.premium)} +{" "}
              {money2(roundToCents(EX_B_RAW - B26.premium))} = {money2(EX_B_RAW)}, rounded to {money2(EX_B)} a month. In 2027 the same {pct(PEN_B * 2, 0)} rides
              on the higher premium.
            </li>
            <li>
              <strong>Part D:</strong> 17 months without drug coverage in 2026 is {pct(PEN_D, 0)} × {money2(D26.baseBeneficiaryPremium)} × 17 ={" "}
              {money2(partDPenaltyRaw(2026, 17))}, rounded to {money2(EX_D26)} a month. In 2027 the base rises to {money2(D27.baseBeneficiaryPremium)}, so the
              same 17 months cost {money2(EX_D27)}.
            </li>
            <li>
              <strong>Part A:</strong> only matters if you buy Part A because you have fewer than 40 quarters — a {pct(PART_A_PENALTY.value.rate, 0)} surcharge
              for twice the number of years you waited.
            </li>
          </ul>
          <p>
            The costliest mistake: assuming COBRA or retiree health coverage lets you delay Part B. It doesn’t — only coverage from a <em>current</em> job
            (yours or your spouse’s) does. For Part D, any gap of {PENALTIES.value.partDGapDays} days or more without creditable drug coverage starts the clock.
          </p>

          <h2>What is the hold-harmless rule, and who does it protect?</h2>
          <p className="answer">
            Hold-harmless stops your Social Security payment from shrinking when the Part B increase is bigger than your cost-of-living raise. It covers people
            who got Social Security last November and December with Part B taken out, and who don’t pay IRMAA. Their Part B can rise only as far as keeps the
            payment where it was.
          </p>
          {HH_27_ONLY_CARRYOVER ? (
            <p>
              For 2027 it will reach very few people. A {COLA[2027].value}% raise on any check big enough to cover the full {money2(B26.premium)} premium is at
              least {money2(MIN_RAISE_27)} — more than the projected {money2(B_RISE_2027)} increase. So it only helps people who were already held harmless in
              2026 and still pay less than {money2(B26.premium)}. In 2026 the rule reached much further: the premium jumped {money2(B_RISE_2026)} while the COLA
              was {COLA[2026].value}%, so checks under roughly {money(HH_2026)} (but big enough to cover the premium) were protected.
            </p>
          ) : (
            <p>
              For 2027, with a {COLA[2027].value}% COLA and a projected {money2(B_RISE_2027)} increase, that means checks under about {money(HH_2027)} a month.
              In 2026 the rule reached further: the premium jumped {money2(B_RISE_2026)} while the COLA was {COLA[2026].value}%, so checks under roughly{" "}
              {money(HH_2026)} were protected.
            </p>
          )}
          <p>
            Who is <em>not</em> protected:
          </p>
          <ul>
            <li>New enrollees — anyone whose Part B didn’t come out of last December’s check.</li>
            <li>Anyone paying IRMAA.</li>
            <li>People not yet collecting Social Security, who are billed directly.</li>
            <li>People whose benefit is smaller than the premium — there’s no payment left to protect.</li>
            <li>People whose state pays their premium through Medicaid (the state pays the full standard amount).</li>
          </ul>
          <p>Late-enrollment penalties are always figured on the full standard premium, even for protected beneficiaries.</p>

          <h2>What was the {money(REBATE.amount)} Part B rebate?</h2>
          <p className="answer">
            In {REBATE.month}, CMS sent a one-time {money(REBATE.amount)} Part B premium rebate from the Medicare Improvement Fund to people in Original
            Medicare. Medicare Advantage members, people who pay IRMAA and people whose premium Medicaid pays were excluded. It doesn’t change the 2026 or 2027
            premium itself.
          </p>
          <p>Our calculator subtracts it from your 2026 yearly total when you qualify. Don’t count on a repeat in 2027 — none has been announced.</p>

          <h2>Is Medicare Advantage cheaper than Original Medicare?</h2>
          <p className="answer">
            On premiums, usually yes: the average Medicare Advantage premium is projected at {money2(AVG27.ma)} a month in 2027, versus about {money(AVG27.pdp)}{" "}
            for a stand-alone drug plan — and Advantage plans usually include drug coverage. But you still pay Part B, and networks and prior approvals can cost
            you when you’re sick.
          </p>
          <p>
            Our view: compare total cost in a bad year, not premiums in a good one. Add each plan’s out-of-pocket maximum to its premium. If you travel a lot or
            want any doctor who takes Medicare, Original Medicare with a supplement and a Part D plan is usually worth the higher premium. And decide carefully
            the first time — in most states, moving from Advantage back to a Medigap policy later can mean answering health questions.
          </p>

          <h2>How much Medicare comes out of my Social Security check?</h2>
          <p className="answer">
            Social Security automatically deducts your Part B premium — including any IRMAA and late penalty — and any Part D IRMAA. Your drug or Advantage
            plan’s premium is paid to the plan unless you ask for it to come out of your check too. In 2027, an average retired worker’s {money(AVG_WORKER_27)}{" "}
            check would shrink by {money2(B27.premium)} for Part B.
          </p>
          <p>
            That leaves {money2(AVG_WORKER_27 - B27.premium)}, paid as {money(roundDownToDollar(AVG_WORKER_27 - B27.premium))} because Social Security rounds
            payments down to the whole dollar. If you aren’t collecting benefits yet, Medicare bills you instead — every three months when it’s only Part B. See
            what the raise does to your check on our <Link href="/social-security-cola">2027 COLA page</Link>.
          </p>
        </ProseCard>

        <Faq items={FAQ} />
        <SourceList
          sources={[
            SRC.cms2026Premiums,
            SRC.fr2026PartB,
            SRC.medicareTrustees2026,
            SRC.cmsPartD2027,
            SRC.cmsRate2027,
            SRC_MEDICARE_EXTRA.cmsMaPdp2027,
            SRC.medicareGovPenalty,
            SRC_MEDICARE_EXTRA.medicareGovPartDLep,
            SRC_MEDICARE_EXTRA.ecfr40824,
            SRC_MEDICARE_EXTRA.ecfr40827,
            SRC_MEDICARE_EXTRA.ecfr423286,
            SRC.ssaPomsIrmaa,
            SRC.statuteIrmaa,
            SRC_MEDICARE_EXTRA.ecfr4181205,
            SRC.cmsRebate2026,
            SRC.ssaCola2027,
          ]}
        />
        <Feedback />
        <RelatedTools slugs={tool.next} />
      </ContentSection>
    </>
  );
}
