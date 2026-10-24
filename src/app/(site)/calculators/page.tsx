import type { Metadata } from "next";
import Link from "next/link";
import { ToolHero } from "@/components/tool/ToolHero";
import { ContentSection } from "@/components/tool/CalculatorShell";
import { Icon } from "@/components/ui/Icon";
import { pageMetadata } from "@/lib/seo";
import { TOOLS, TOOL_GROUPS } from "@/lib/tools";

const TITLE = "Retirement Calculators: Social Security, Medicare, RMDs, Taxes";
const DESC =
  "Every Sundial Years calculator in one place — Social Security claiming, spouse and survivor benefits, Medicare enrollment and penalties, RMDs, IRMAA and retirement taxes.";

export const metadata: Metadata = pageMetadata({ title: TITLE, description: DESC, path: "/calculators" });

const INTRO: Record<string, string> = {
  "Social Security": "When to claim, what a spouse, ex-spouse or widow gets, and how the formula, credits and trust fund affect your check.",
  Medicare: "Sign-up windows, late penalties, premiums, IRMAA and the programs that pay Medicare costs for people with lower incomes.",
  "RMDs & IRAs": "Required minimum distributions, penalties, QCDs, QLACs and what withdrawals cost in tax.",
  Taxes: "Federal tax on retirement income: Social Security, Roth conversions, capital gains, the senior deduction and withholding.",
  Planning: "How long savings last, safe withdrawal rates, life expectancy, pensions and catch-up contributions.",
  "Key numbers": "The official figures behind everything else, updated when the agencies publish them.",
};

export default function Page() {
  return (
    <>
      <ToolHero
        crumbs={[{ name: "All calculators", path: "/calculators" }]}
        eyebrow="Directory"
        icon="spark"
        title="Retirement calculators"
        lead={
          <p>
            {TOOLS.length} free tools that answer one retirement question each, with the official SSA, CMS and IRS figures for the year and the math shown. Pick the
            question you have today.
          </p>
        }
      />
      <ContentSection className="space-y-10">
        {TOOL_GROUPS.map((g) => {
          const items = TOOLS.filter((t) => t.group === g);
          if (!items.length) return null;
          return (
            <section key={g} aria-labelledby={`g-${g.replace(/\W+/g, "-")}`}>
              <h2 id={`g-${g.replace(/\W+/g, "-")}`} className="px-1 text-[1.75rem] font-semibold">
                {g}
              </h2>
              <p className="mt-1 max-w-3xl px-1 text-[1.0625rem] text-ink-2">{INTRO[g]}</p>
              <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {items.map((t) => (
                  <Link key={t.slug} href={`/${t.slug}`} className="float float-lift group flex flex-col p-5">
                    <span className="flex items-center gap-2.5 text-[1.125rem] font-bold leading-snug text-ink">
                      <span className="text-sun-ink">
                        <Icon name={t.icon} size={20} />
                      </span>
                      {t.title}
                    </span>
                    <span className="mt-2 flex-1 text-[1rem] leading-relaxed text-ink-2">{t.blurb}</span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </ContentSection>
    </>
  );
}
