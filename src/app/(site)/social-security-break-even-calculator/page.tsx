import type { Metadata } from "next";
import Link from "next/link";
import { ToolHero } from "@/components/tool/ToolHero";
import { SsClaimingCalculator } from "@/components/calculators/ss-claiming/SsClaimingCalculator";
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
import { SITE } from "@/lib/site";
import { money } from "@/lib/format";
import { SRC } from "@/data/params/sources";
import { CLAIMING_RULES, COLA, SS_YEAR, TR_ECON, TRUST_FUNDS } from "@/data/params/social-security";
import { BENEFIT_TAX_MAX_SHARE, CLAIM_SRC, DEEMED_FILING_DOB, REDUCTION_TIER_MONTHS, RET_WITHHOLDING, SPOUSAL, SURVIVOR } from "@/data/params/ss-claiming-extra";
import { MEDICARE_ENROLLMENT } from "@/data/params/birth-year-extra";
import { drcPerMonth, earlyRetirementFactor, fraForCohort, spousalFactor } from "@/lib/calc/ss-core";
import {
  ageLabel,
  bestOf,
  breakEven,
  claimMonthForAge,
  claimTable,
  expectedByClaimMonth,
  payment,
  probAliveAtAgeMonths,
  survivalModel,
  survivorAmount,
  survivorTerms,
  type BreakEven,
  type Person,
  type QxTable,
  type Settings,
} from "@/lib/calc/ss-claiming";
import { fractionOfOnePercent, oddsText, pctOfPia } from "@/components/calculators/ss-claiming/labels";
import cohortJson from "../../../../public/data/cohort-qx-tr2026.json";

const SLUG = "social-security-break-even-calculator";
const TITLE = "Social Security Break-Even Calculator: Best Age to Claim";
const DESC =
  "See your Social Security check at every age from 62 to 70, your break-even age, the odds you’ll live past it, and the claiming age that pays you the most.";

export const metadata: Metadata = pageMetadata({ title: TITLE, description: DESC, path: `/${SLUG}` });

// ── Worked example, computed at build time from the same engine and SSA tables the calculator uses ────────────
// Illustrative inputs (not parameters): someone who is 61 this year, born on the 15th, with a $2,000 benefit at FRA.
const COHORT = cohortJson as unknown as QxTable;
const [vy, vm, vd] = SITE.dataVerifiedOn.split("-").map(Number);
const AS_OF = { year: vy, month: vm, day: vd };
const EX_PIA = 2000;
const EX: Person = { dob: { year: SITE.copyrightYear - 61, month: 6, day: 15 }, pia: EX_PIA, sex: "m", health: "average" };
const EX_WOMAN: Person = { ...EX, sex: "f" };
const TODAY: Settings = { asOf: AS_OF, growth: "none", colaPct: TR_ECON.value.colaAssumptionAfter2027, cut: false };
const FUTURE: Settings = { ...TODAY, growth: "cola" };
const at = (ageYears: number) => claimMonthForAge(EX.dob, ageYears * 12);
const FRA_NEW = fraForCohort(EX.dob.year); // 67 for everyone born 1960 or later
const fraYears = FRA_NEW.years;
/** First birth (cohort) year whose full retirement age is FRA_NEW — derived from the FRA table in ss-core. */
const FRA_NEW_FROM = (() => {
  let y = EX.dob.year;
  while (fraForCohort(y - 1).total === FRA_NEW.total) y--;
  return y;
})();
/** The COLA first paid in January 2027 took effect for December 2026 (and so covers everyone who turned 62 by then). */
const COLA_PAY_YEAR = 2027 as const;
const COLA_DEC_YEAR = COLA_PAY_YEAR - 1;
const TIER = REDUCTION_TIER_MONTHS.value;
const W = RET_WITHHOLDING.value;
const rows = claimTable(EX, TODAY);
const row62 = rows[0];
const rowFra = rows.find((r) => r.isFra)!;
const row70 = rows[rows.length - 1];
const be62v70 = breakEven(EX, at(62), at(70), TODAY)!;
const be62vFra = breakEven(EX, at(62), at(fraYears), TODAY)!;
const beFrav70 = breakEven(EX, at(fraYears), at(70), TODAY)!;
const be62v70Future = breakEven(EX, at(62), at(70), FUTURE)!;
const be62v70Cut = breakEven(EX, at(62), at(70), { ...TODAY, cut: true })!;
const modelM = survivalModel(COHORT, "m", EX.dob.year, "average");
const modelF = survivalModel(COHORT, "f", EX.dob.year, "average");
const oddsM = (be: BreakEven) => oddsText(probAliveAtAgeMonths(modelM, EX.dob, AS_OF, be.ageMonths));
const oddsF = (be: BreakEven) => oddsText(probAliveAtAgeMonths(modelF, EX_WOMAN.dob, AS_OF, be.ageMonths));
const expM = expectedByClaimMonth(EX, { asOf: AS_OF, cut: false, realDiscountPct: 0 }, modelM);
const bestM = bestOf(expM);
const gainM = bestM.value - expM[0].value;

/** 80.42 → "80½"; 78.6 → "78½"; 82.0 → "82". */
function aboutAge(be: BreakEven) {
  const half = Math.round(be.ageMonths / 6) / 2;
  return Number.isInteger(half) ? `${half}` : `${Math.floor(half)}½`;
}

// Survivor example: the higher earner ($2,000 PIA) dies after the survivor has reached survivor full retirement age.
const SURVIVOR_EX: Person = { dob: { year: EX.dob.year + 2, month: 3, day: 10 }, pia: 0, sex: "f", health: "average" };
const deathLate = claimMonthForAge(SURVIVOR_EX.dob, 75 * 12);
const widow = (claimAge: number) => survivorAmount(survivorTerms(EX, at(claimAge), deathLate, SURVIVOR_EX), EX_PIA);
/** Chance that at least one of the couple (independent lives, SSA cohort tables) reaches 90. */
const wifeModel = survivalModel(COHORT, "f", SURVIVOR_EX.dob.year, "average");
const eitherTo90 = 1 - (1 - probAliveAtAgeMonths(modelM, EX.dob, AS_OF, 90 * 12)) * (1 - probAliveAtAgeMonths(wifeModel, SURVIVOR_EX.dob, AS_OF, 90 * 12));

// Percent of full benefit by start age for anyone born 1960 or later (FRA 67).
const PCT_ROWS = Array.from({ length: 9 }, (_, i) => 62 + i).map((age) => {
  const diff = age * 12 - FRA_NEW.total;
  const factor = diff < 0 ? earlyRetirementFactor(-diff) : 1 + diff * drcPerMonth(EX.dob.year);
  return { age, factor, spouse: diff < 0 ? SPOUSAL.value.basePctOfPia * spousalFactor(-diff) : SPOUSAL.value.basePctOfPia };
});
const earlyYear = CLAIMING_RULES.earlyFirst36PerMonth * 12;
const earlyYearBeyond = CLAIMING_RULES.earlyBeyond36PerMonth * 12;
const drcYear = drcPerMonth(EX.dob.year) * 12;
const TF = TRUST_FUNDS.value.oasiDepletion;
const cutPct = 100 - TF.payablePct;
const deemedYear = Number(DEEMED_FILING_DOB.value.slice(0, 4));
const ret = SS_YEAR[2027].value;

const FAQ: FaqItem[] = [
  {
    q: "What is the break-even age for Social Security?",
    a: `It is the age at which a later start has paid you as much in total as an earlier one. With a full retirement age of ${fraYears}, starting at 70 instead of 62 breaks even at about ${aboutAge(be62v70)} in today’s dollars; starting at ${fraYears} instead of 62 breaks even near ${aboutAge(be62vFra)}. Live past the break-even and waiting wins.`,
  },
  {
    q: "Is it better to take Social Security at 62 or 70?",
    a: `For a single person in average health who can afford to wait, 70 usually pays more over a lifetime: a man who is 61 today has a ${oddsM(be62v70)} chance of living past the ${aboutAge(be62v70)} break-even, a woman ${oddsF(be62v70)}. Claiming at 62 makes sense with serious health problems, an urgent need for income, or as the lower earner in a couple.`,
  },
  {
    q: "Do I still get cost-of-living increases if I wait to claim?",
    a: `Yes. COLAs raise your full-retirement-age amount every year starting with the year you turn 62, whether or not you have filed, so waiting never costs you a COLA. The ${COLA[COLA_PAY_YEAR].value}% COLA for ${COLA_PAY_YEAR} applies to everyone who turned 62 in ${COLA_DEC_YEAR} or earlier. Delayed credits are added on top of those COLAs.`,
  },
  {
    q: "How much will my spouse get from Social Security if I die?",
    a: `A widow or widower at full survivor age receives 100% of what you were getting, including delayed credits — ${pctOfPia(row70.factor)} of your full amount if you waited to 70. If you started early, they get the larger of your reduced check or ${pctOfPia(SURVIVOR.value.ribLimFloorPctOfPia)} of your full amount. Survivors can start as early as ${SURVIVOR.value.minAge} at a reduced rate.`,
  },
  {
    q: "Can I take spousal benefits now and let my own benefit grow?",
    a: `Not if you were born on or after January 2, ${deemedYear}. Under the deemed-filing rule, applying for either your own or a spousal benefit counts as applying for both, so you get your own benefit plus any spousal top-up together. Survivor benefits are different: a widow or widower can take one and switch to the other later.`,
  },
  {
    q: "Should I claim early because Social Security is running out of money?",
    a: `Usually not. The Trustees project the retirement trust fund will be depleted in ${TF.year}, after which taxes still cover about ${TF.payablePct}% of benefits. A cut would apply to everyone collecting, early or late. Even then, our example’s 62-versus-70 break-even moves from about ${aboutAge(be62v70)} to ${aboutAge(be62v70Cut)} — an age ${oddsM(be62v70Cut)} of men and ${oddsF(be62v70Cut)} of women who are 61 today will live past.`,
  },
  {
    q: "What happens if I claim early and keep working?",
    a: `Before the year you reach full retirement age, SSA withholds $1 of benefits for every $${W.beforeFraYear} you earn above ${money(ret.retUnderFraAnnual)} in 2027; in that year, $1 for every $${W.fraYear} above ${money(ret.retFraYearAnnual)}. Withheld months are not lost — your check is recalculated upward at full retirement age — but claiming early while working full time rarely makes sense.`,
  },
];

export default function Page() {
  const tool = toolBySlug(SLUG)!;
  return (
    <>
      <JsonLd data={calculatorLd({ name: "Social Security Break-Even Calculator", description: DESC, path: `/${SLUG}` })} />
      <ToolHero
        crumbs={[{ name: "Social Security Break-Even Calculator", path: `/${SLUG}` }]}
        eyebrow="Social Security"
        icon="clock"
        title={
          <>
            When to claim Social Security: <span className="italic font-normal text-sun-ink">break-even calculator</span>
          </>
        }
        lead={
          <p>
            If you’re single, healthy and can afford to wait, starting at 70 usually pays the most; starting at 62 only comes out ahead if you die before about{" "}
            {aboutAge(be62v70)}. Enter your birth date and the benefit on your statement to see your own break-even ages, the odds you’ll live past them, and — if
            you’re married — your best plan as a couple.
          </p>
        }
        chips={
          <>
            <StatusChip status={COLA[2027].status}>2027 COLA {COLA[2027].value}%</StatusChip>
            <StatusChip status="official">SSA life tables (2026 Trustees Report)</StatusChip>
          </>
        }
      />

      <SsClaimingCalculator />

      <AdSlot />

      <ContentSection className="mt-16 space-y-10">
        <ProseCard>
          <h2>What is the Social Security break-even age?</h2>
          <p className="answer">
            It’s the age at which waiting to claim has paid you as much in total as claiming earlier. With a full retirement age of {fraYears}, starting at 70 instead of 62 breaks
            even at about {aboutAge(be62v70)} in today’s dollars. Live longer than that and waiting wins; die sooner and the early start wins.
          </p>
          <p>
            Here is the math for someone who is 61 this year with a {money(EX_PIA)} benefit at full retirement age (the number on their Social Security Statement). Starting
            as soon as possible pays {money(row62.monthlyToday)} a month; waiting to {fraYears} pays {money(rowFra.monthlyToday)}; waiting to 70 pays {money(row70.monthlyToday)} — for
            life, with cost-of-living raises on top.
          </p>
          <div className="not-prose overflow-x-auto">
            <table className="table-sy mt-4 text-[1rem]">
              <caption className="sr-only">Break-even ages and the chance of living past them for a 61-year-old</caption>
              <thead>
                <tr>
                  <th>Comparing</th>
                  <th>Break-even age</th>
                  <th>Chance a man lives past it</th>
                  <th>Chance a woman lives past it</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: `62 vs ${fraYears}`, be: be62vFra },
                  { label: `${fraYears} vs 70`, be: beFrav70 },
                  { label: "62 vs 70", be: be62v70 },
                ].map((r) => (
                  <tr key={r.label}>
                    <td className="strong">{r.label}</td>
                    <td>{aboutAge(r.be)}</td>
                    <td>{oddsM(r.be)}</td>
                    <td>{oddsF(r.be)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            The odds come from SSA’s own cohort life tables for people born in {EX.dob.year}, which build in expected improvements in longevity. At 61, {oddsM(be62v70)} of men
            and {oddsF(be62v70)} of women live past the 62-versus-70 break-even — so plan for a long life, not an average one. The when-to-take-Social-Security
            calculator above runs the same math with your own birth date, benefit and health.
          </p>

          <h2>What is the best age to claim Social Security?</h2>
          <p className="answer">
            For a single person in average health who doesn’t need the money, 70 gives the most expected lifetime income. Claiming earlier is reasonable if your health is
            poor, you need the income now, or you are the lower earner in a couple whose spouse is delaying.
          </p>
          <p>
            Weighting every month’s check by the chance of being alive to receive it, the best start for our 61-year-old man is {ageLabel(bestM.ageMonths)},
            worth about {money(gainM)} more over his expected lifetime than starting right away (in today’s dollars). Our honest view: treat Social Security as longevity
            insurance. The years you most need a big, inflation-protected check are your late 80s and 90s, when savings are thinnest.
          </p>
          <p>Claiming early makes sense when:</p>
          <ul>
            <li>You have a serious illness or a family history of dying young — set “Shorter” in the calculator and see how the answer moves.</li>
            <li>You’ve stopped working and the only alternative is high-interest debt or selling investments in a crash.</li>
            <li>You’re the lower earner in a couple and the higher earner is waiting — your own small check may be worth taking first.</li>
            <li>You’re single with no heirs who’d benefit, and you value money in your 60s much more than money in your 90s.</li>
          </ul>

          <h2>How much does each year of waiting add?</h2>
          <p className="answer">
            Before full retirement age, each year you wait adds about {pctOfPia(earlyYear)} of your full benefit (or {pctOfPia(earlyYearBeyond)} a year beyond the first {TIER / 12} years early).
            After it, delayed retirement credits add {pctOfPia(drcYear)} a year until 70, when they stop. All told, waiting from 62 to 70 makes your check about{" "}
            {pctOfPia(PCT_ROWS[PCT_ROWS.length - 1].factor / PCT_ROWS[0].factor - 1)} bigger, for life.
          </p>
          <div className="not-prose overflow-x-auto">
            <table className="table-sy mt-4 text-[1rem]">
              <caption className="sr-only">Benefit as a percent of the full amount by starting age, born {FRA_NEW_FROM} or later</caption>
              <thead>
                <tr>
                  <th>Start at</th>
                  <th>Your benefit</th>
                  <th>Per $1,000 of full benefit</th>
                  <th>Spouse starting at this age gets (share of your full amount)</th>
                </tr>
              </thead>
              <tbody>
                {PCT_ROWS.map((r) => (
                  <tr key={r.age}>
                    <td className="strong">{r.age === FRA_NEW.total / 12 ? `${r.age} (full retirement age)` : r.age}</td>
                    <td>{pctOfPia(r.factor)}</td>
                    <td>{money(payment(1000, r.factor))}</td>
                    <td>{pctOfPia(r.spouse)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            For people born {FRA_NEW_FROM} or later (full retirement age {FRA_NEW.label}). The exact reduction is {fractionOfOnePercent(CLAIMING_RULES.earlyFirst36PerMonth)} per month for the
            first {TIER} months early and {fractionOfOnePercent(CLAIMING_RULES.earlyBeyond36PerMonth)} per month beyond that. See your own age on the{" "}
            <Link href="/full-retirement-age">full retirement age chart</Link>. Note the spouse column stops growing at full retirement age: spousal benefits earn no delayed credits.
          </p>

          <h2>Why should the higher earner in a married couple wait?</h2>
          <p className="answer">
            Because the larger of the two checks becomes the survivor’s check. When one spouse dies, the other keeps whichever benefit is bigger, so delaying the higher earner’s
            claim raises the income of whoever lives longer — more often the wife, since women live longer on average.
          </p>
          <p>
            Take our {money(EX_PIA)} earner. If he starts at 62 and dies first, his widow’s survivor benefit is capped at the larger of his reduced check or{" "}
            {pctOfPia(SURVIVOR.value.ribLimFloorPctOfPia)} of his full amount: {money(widow(62))} a month. If he waits to {fraYears} it’s {money(widow(fraYears))}; if he waits to 70,
            {" "}{money(widow(70))} — for the rest of her life. For a 61-year-old man and his wife two years younger, there’s a {oddsText(eitherTo90)} chance at least one of
            them reaches 90, which is why the higher earner’s break-even is really a “second-to-die” break-even.
          </p>
          <p>
            The lower earner’s decision matters less. A spousal benefit tops you up to {pctOfPia(SPOUSAL.value.basePctOfPia)} of your spouse’s full amount — never more, even if they
            wait to 70 — and only once they have filed. Turn on “I’m married” in the calculator to compare every combination.
          </p>

          <h2>How do COLAs change the break-even?</h2>
          <p className="answer">
            In today’s dollars they don’t: everyone gets the same yearly raises. In future dollars, cost-of-living adjustments make the bigger, later checks grow by more dollars,
            so the 62-versus-70 break-even moves from about {aboutAge(be62v70)} to about {aboutAge(be62v70Future)} with the Trustees’ {TR_ECON.value.colaAssumptionAfter2027}% assumption.
          </p>
          <p>
            Two facts people miss. First, COLAs start applying to your benefit in the year you turn 62 even if you haven’t claimed, so waiting never forfeits a raise — the{" "}
            {COLA[2027].value}% <Link href="/social-security-cola">2027 COLA</Link> applies to everyone who turned 62 in {COLA_DEC_YEAR} or earlier, claimed or not. Second, delayed
            credits are real, inflation-protected gains: an {pctOfPia(drcYear)} raise per year, guaranteed for life — a kind of annuity that would be expensive to buy from an insurer. We show today’s dollars by default
            because a dollar at 85 buys less than a dollar at 62; flip the setting to see future dollars.
          </p>

          <h2>Will Social Security run out — should I claim early because of it?</h2>
          <p className="answer">
            No. The 2026 Trustees Report projects the retirement trust fund will be depleted in {TF.year}, but payroll taxes would still pay about {TF.payablePct}% of scheduled
            benefits. A cut would hit everyone collecting, so claiming early to “get yours first” mostly locks in a smaller check for life.
          </p>
          <p>
            Run the numbers yourself with the “cut” setting: a {cutPct}% across-the-board cut from {TF.year} pushes our example’s 62-versus-70 break-even from about{" "}
            {aboutAge(be62v70)} to about {aboutAge(be62v70Cut)} — and a 61-year-old man still has a {oddsM(be62v70Cut)} chance of living past it. Congress has always acted before a depletion date in the past; nothing guarantees it will this time, which is why
            we let you test the worst case rather than assume it.
          </p>

          <h2>Common claiming mistakes</h2>
          <ul>
            <li>
              <strong>Judging by the break-even alone.</strong> The question isn’t “will I live past {aboutAge(be62v70)}?” but “how bad would it be if I did, on a small check?”
            </li>
            <li>
              <strong>Ignoring the survivor.</strong> A higher earner who claims at 62 permanently shrinks the widow(er)’s income.
            </li>
            <li>
              <strong>Claiming early while still working.</strong> The <Link href="/social-security-earnings-limit-calculator">earnings test</Link> can hold back most of your checks.
            </li>
            <li>
              <strong>Waiting past 70.</strong> Credits stop at 70; there is nothing to gain by waiting longer.
            </li>
            <li>
              <strong>Forgetting Medicare.</strong> Sign up for Medicare around {MEDICARE_ENROLLMENT.value.eligibilityAge} even if you delay Social Security (unless you have coverage from a current job), or you may owe
              lifelong late-enrollment penalties.
            </li>
            <li>
              <strong>Forgetting taxes.</strong> Up to {pctOfPia(BENEFIT_TAX_MAX_SHARE.value)} of benefits can be taxable — check yours with the{" "}
              <Link href="/taxable-social-security-calculator">Social Security tax calculator</Link>.
            </li>
          </ul>
        </ProseCard>

        <Faq items={FAQ} />
        <SourceList
          sources={[
            SRC.ssaArDrc,
            SRC.ssaAgeReduction,
            SRC.ssaDelayedCredits,
            SRC.ssaFra,
            SRC.ssaSpouse,
            SRC.ssaSurvivor,
            SRC.ssaCohortLife,
            SRC.ssaTrustees2026,
            CLAIM_SRC.trHighlights2026,
            CLAIM_SRC.trEcon2026,
            SRC.ssaLatestCola,
            SRC.ssaColaSeries,
            CLAIM_SRC.ecfr404_212,
            CLAIM_SRC.ecfr404_313,
            CLAIM_SRC.ecfr404_333,
            CLAIM_SRC.ecfr404_338,
            CLAIM_SRC.pomsDualEntitlement,
            CLAIM_SRC.pomsRibLim,
            CLAIM_SRC.pomsDeemedFiling,
            CLAIM_SRC.oactPiaFormula,
            CLAIM_SRC.ecfr404_211,
            CLAIM_SRC.oactQuickCalc,
            SRC.ssaWhileWorking,
          ]}
        />
        <Feedback />
        <RelatedTools slugs={tool.next} />
      </ContentSection>
    </>
  );
}
