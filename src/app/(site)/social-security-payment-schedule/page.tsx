import type { Metadata } from "next";
import Link from "next/link";
import { ToolHero } from "@/components/tool/ToolHero";
import { PaymentFinder } from "@/components/calculators/payment-schedule/PaymentFinder";
import { ContentSection, ProseCard } from "@/components/tool/CalculatorShell";
import { Faq, type FaqItem } from "@/components/tool/Faq";
import { SourceList } from "@/components/tool/SourceList";
import { RelatedTools } from "@/components/tool/RelatedTools";
import { Feedback } from "@/components/tool/Feedback";
import { AdSlot } from "@/components/tool/AdSlot";
import { StatusChip } from "@/components/tool/StatusChip";
import { JsonLd } from "@/components/site/JsonLd";
import { calculatorLd, pageMetadata } from "@/lib/seo";
import { yearSchedule, prettyDate, MONTH_NAMES, type PaymentGroup } from "@/lib/calc/payment-schedule";
import { SRC } from "@/data/params/sources";
import { COLA } from "@/data/params/social-security";

const SLUG = "social-security-payment-schedule";
const TITLE = "Social Security Payment Schedule 2027: Every Date";
const DESC =
  "The official 2027 Social Security and SSI payment dates by birthday — second, third and fourth Wednesdays, the 3rd of the month, and when SSI arrives early.";

export const metadata: Metadata = pageMetadata({ title: TITLE, description: DESC, path: `/${SLUG}` });

const SRC_SCHEDULE = { label: "SSA Publication 05-10031 — Schedule of Social Security Benefit Payments 2027", url: "https://www.ssa.gov/pubs/EN-05-10031-2027.pdf", publisher: "SSA" as const };

const GROUPS: { g: PaymentGroup; label: string; who: string; cls: string }[] = [
  { g: "wed2", label: "Second Wednesday", who: "Born on the 1st–10th", cls: "bg-[var(--ink)] text-[var(--void)]" },
  { g: "wed3", label: "Third Wednesday", who: "Born on the 11th–20th", cls: "bg-sky-wash text-sky font-bold" },
  { g: "wed4", label: "Fourth Wednesday", who: "Born on the 21st–31st", cls: "bg-sun-wash text-sun-ink font-bold" },
  { g: "third", label: "3rd of the month", who: "Benefits before May 1997, or SS + SSI", cls: "ring-2 ring-[var(--ink)] font-bold" },
  { g: "ssi", label: "SSI (1st of the month)", who: "Supplemental Security Income", cls: "bg-sage-wash text-sage font-bold rounded-full" },
];

function MonthGrid({ year, month }: { year: number; month: number }) {
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const marks = new Map<number, string>();
  for (const { g, cls } of GROUPS) {
    for (const p of yearSchedule(g, year).concat(g === "ssi" ? yearSchedule("ssi", year + 1).slice(0, 1) : [])) {
      const [y, m, d] = p.date.split("-").map(Number);
      if (y === year && m === month) marks.set(d, `${marks.get(d) ?? ""} ${cls}`);
    }
  }
  const cells = [...Array.from({ length: first }, () => null), ...Array.from({ length: days }, (_, i) => i + 1)];
  return (
    <div className="float-soft p-4">
      <p className="mb-2 text-center font-bold text-ink">
        {MONTH_NAMES[month - 1]} {year}
      </p>
      <div className="grid grid-cols-7 gap-1 text-center text-[0.9rem]" role="presentation">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span key={i} className="text-[0.75rem] font-bold text-ink-3">
            {d}
          </span>
        ))}
        {cells.map((d, i) =>
          d == null ? (
            <span key={`e${i}`} />
          ) : (
            <span key={d} className={`num grid h-8 place-items-center rounded-lg ${marks.get(d) ?? "text-ink-2"}`}>
              {d}
            </span>
          ),
        )}
      </div>
    </div>
  );
}

const FAQ: FaqItem[] = [
  {
    q: "When will I get my January 2027 Social Security payment?",
    a: "It depends on your birthday: January 13 if you were born on the 1st–10th, January 20 for the 11th–20th, and January 27 for the 21st–31st. People paid on the 3rd and SSI recipients get their January payment on December 31, 2026, because January 1 is a holiday and January 3 is a Sunday.",
  },
  {
    q: "When does the 3.6% COLA show up?",
    a: `The ${COLA[2027].value}% cost-of-living adjustment applies to benefits for December 2026, which are paid in January 2027. SSI recipients see it first, in the payment made December 31, 2026.`,
  },
  {
    q: "Why did I get two SSI payments in one month?",
    a: "When the 1st falls on a weekend or holiday, SSI is paid on the business day before — sometimes the last day of the previous month. In 2027 that happens for May (paid April 30) and August (paid July 30), and January 2028 SSI arrives December 30, 2027. It is not an extra payment, so budget it for the next month.",
  },
  {
    q: "Which birthday counts if I get spouse or survivor benefits?",
    a: "Your payment day is based on the birthday of the person whose work record you’re paid on. A spouse paid on a husband’s record born on the 8th, for example, is paid on the second Wednesday.",
  },
  {
    q: "What should I do if my payment doesn’t arrive?",
    a: "Social Security asks you to allow three additional mailing days after your scheduled date before you contact them. Direct deposits usually arrive on the date shown; check with your bank first.",
  },
];

export default function Page() {
  return (
    <>
      <JsonLd data={calculatorLd({ name: "Social Security payment date finder", description: DESC, path: `/${SLUG}` })} />
      <ToolHero
        crumbs={[{ name: "Social Security payment schedule", path: `/${SLUG}` }]}
        eyebrow="Social Security"
        icon="calendar"
        title={
          <>
            Social Security payment schedule <span className="italic font-normal text-sun-ink">2027</span>
          </>
        }
        lead={
          <p>
            Social Security pays on the second, third or fourth Wednesday of the month depending on your birthday; SSI arrives on the 1st. Pick your birth day to see
            every 2027 date — the January payment is the first with the {COLA[2027].value}% raise.
          </p>
        }
        chips={<StatusChip status="official">SSA schedule for 2027</StatusChip>}
      />

      <PaymentFinder />

      <AdSlot />

      <ContentSection className="mt-16 space-y-10">
        <section className="float p-6 sm:p-8" aria-labelledby="cal-h">
          <h2 id="cal-h" className="text-[1.75rem] font-semibold">
            The full 2027 calendar
          </h2>
          <ul className="mt-4 flex flex-wrap gap-3 text-[0.95rem]">
            {GROUPS.map((g) => (
              <li key={g.g} className="flex items-center gap-2">
                <span className={`num grid h-7 w-7 place-items-center rounded-lg ${g.cls}`}>8</span>
                <span>
                  <strong className="text-ink">{g.label}</strong> <span className="text-ink-3">· {g.who}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 12 }, (_, i) => (
              <MonthGrid key={i} year={2027} month={i + 1} />
            ))}
          </div>
          <p className="mt-4 text-[0.95rem] text-ink-3">
            December 30, 2027 is SSI for January 2028 (January 1, 2028 is a Saturday and the holiday is observed on Friday, December 31).
          </p>
        </section>

        <ProseCard>
          <h2>How does Social Security decide my payment date?</h2>
          <p className="answer">
            Your birthday decides it: the 1st–10th are paid on the second Wednesday, the 11th–20th on the third Wednesday, and the 21st–31st on the fourth Wednesday.
            Two groups are paid on the 3rd instead: people who started benefits before May 1997 and people who also get SSI.
          </p>
          <p>
            The system was introduced in 1997 to spread payments across the month. It never changes from year to year, so once you know your Wednesday you know
            every date — the only surprises are holidays and weekends, which always move a payment <em>earlier</em>, never later.
          </p>
          <h2>Which 2027 dates move because of weekends or holidays?</h2>
          <p className="answer">In 2027, no Wednesday payment moves. Payments on the 1st and 3rd move earlier several times.</p>
          <ul>
            {yearSchedule("third", 2027)
              .filter((p) => p.shifted)
              .map((p) => (
                <li key={`t${p.month}`}>
                  3rd-of-month payment for {MONTH_NAMES[p.month - 1]} arrives <strong>{prettyDate(p.date).label}</strong>
                </li>
              ))}
            {yearSchedule("ssi", 2027)
              .filter((p) => p.shifted)
              .map((p) => (
                <li key={`s${p.month}`}>
                  SSI for {MONTH_NAMES[p.month - 1]} arrives <strong>{prettyDate(p.date).label}</strong>
                </li>
              ))}
          </ul>
          <h2>Is my January check bigger?</h2>
          <p className="answer">
            Yes — January 2027 is the first payment with the {COLA[2027].value}% cost-of-living adjustment, minus any change in your Medicare Part B premium.
          </p>
          <p>
            See what the raise means for your check after Medicare on the <Link href="/social-security-cola">2027 COLA page</Link>, or check how the{" "}
            <Link href="/social-security-earnings-limit-calculator">earnings test</Link> can pause payments if you’re still working.
          </p>
        </ProseCard>

        <Faq items={FAQ} />
        <SourceList sources={[SRC_SCHEDULE, SRC.ssaCola2027]} />
        <Feedback />
        <RelatedTools slugs={["social-security-cola", "social-security-earnings-limit-calculator", "medicare-premium-calculator"]} />
      </ContentSection>
    </>
  );
}
