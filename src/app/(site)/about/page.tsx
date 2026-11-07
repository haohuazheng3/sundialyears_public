import type { Metadata } from "next";
import Link from "next/link";
import { TrustHero } from "@/components/site/contact/TrustHero";
import { REPLY_PROMISE } from "@/components/site/contact/topics";
import { ContentSection, ProseCard } from "@/components/tool/CalculatorShell";
import { RelatedTools } from "@/components/tool/RelatedTools";
import { StatusChip } from "@/components/tool/StatusChip";
import { JsonLd } from "@/components/site/JsonLd";
import { ORG_ID, organizationLd, pageMetadata } from "@/lib/seo";
import { SITE, absoluteUrl } from "@/lib/site";
import { CALCULATORS, REFERENCES } from "@/lib/tools";
import { ALL_SOURCES } from "@/components/site/contact/source-registry";
import { SRC } from "@/data/params/sources";
import { COLA } from "@/data/params/social-security";
import { PART_B } from "@/data/params/medicare";
import { IRS_2027_ADJUSTMENTS } from "@/data/params/tax";
import { longDate, moneySmart } from "@/lib/format";

const PATH = "/about";
/** Last time this page's text was reviewed. A constant — never the clock (pages are static). */
const UPDATED = "2026-10-23";
const TITLE = "About Us: Free Retirement Calculators, Every Source Cited";
const DESC =
  "Why Sundial Years exists, the principles behind every number (primary sources, official vs projected labels, no sign-up) and how the free site is funded.";

export const metadata: Metadata = pageMetadata({ title: TITLE, description: DESC, path: PATH });

const SOURCE_COUNT = ALL_SOURCES.length;

export default function AboutPage() {
  const cola = COLA[2027];
  const partB27 = PART_B[2027];
  return (
    <>
      <JsonLd
        data={[
          organizationLd(),
          {
            "@context": "https://schema.org",
            "@type": "AboutPage",
            name: `About ${SITE.name}`,
            url: absoluteUrl(PATH),
            description: DESC,
            dateModified: UPDATED,
            about: { "@id": ORG_ID },
            publisher: { "@id": ORG_ID },
            inLanguage: "en-US",
          },
        ]}
      />
      <TrustHero
        crumbs={[{ name: "About", path: PATH }]}
        eyebrow={`About ${SITE.name}`}
        icon="spark"
        title={
          <>
            Retirement math, <span className="italic font-normal text-sun-ink">made plain</span> — and free
          </>
        }
        lead={
          <p>
            {SITE.name} is a free set of retirement calculators for Americans aged 55 to 80. We take the official numbers from Social Security,
            Medicare and the IRS, do the math for your situation, and show our work — with no sign-up and nothing to sell you.
          </p>
        }
        updated={UPDATED}
        showVerified
      />

      <ContentSection className="space-y-10">
        <ProseCard>
          <h2>Why does Sundial Years exist?</h2>
          <p className="answer">
            Because the numbers behind retirement decisions change every fall, the official explanations are scattered across dozens of agency
            documents, and most free calculators online exist to collect your phone number. We wanted one place that gives the official answer
            first and explains it in plain English.
          </p>

          <h3>The numbers change every year</h3>
          <p>
            On {longDate(SRC.ssaPress20261014.published)}, the Social Security Administration (SSA) announced a {cola.value}% cost-of-living
            adjustment (COLA) for 2027. In November, the Centers for Medicare &amp; Medicaid Services (CMS) sets the new Part B premium and the
            income brackets for IRMAA, the Medicare surcharge on higher incomes. The IRS adjusts tax brackets in October or November. A
            calculator built last year is quietly wrong this year — and most never say which year they use.
          </p>

          <h3>The official information is scattered and hard to read</h3>
          <p>
            When your first required minimum distribution (RMD) is due lives in Treasury regulations. The IRMAA brackets live in the SSA’s
            internal operations manual. The tax on your benefits is a worksheet in IRS Publication 915. All of it is correct, and almost none of it
            is written for the person who has to make the decision.
          </p>

          <h3>Most calculators are lead-generation funnels</h3>
          <p>
            Search for a Social Security or Medicare calculator and many of the results want your email or phone number before they show a result,
            or they hand you to an advisor or insurance agent who paid for the introduction. We think you should see your number first, with the
            rule behind it, and decide for yourself whether you need help.
          </p>

          <h2>What principles do we work by?</h2>
          <p className="answer">
            Primary sources only, every figure labeled as official or projected, no sign-up, and the math runs in your own browser. If we can’t
            point to the agency document a number came from, it doesn’t go on the site — and if a rule is unclear, we say so instead of
            pretending.
          </p>
          <ul>
            <li>
              <strong>Primary sources only.</strong> Our federal figures come from SSA, CMS, the IRS, Treasury regulations, the laws themselves,
              the Federal Register and the Bureau of Labor Statistics — {SOURCE_COUNT} documents so far — and state rules come from each state’s own
              tax agency. Never a blog or another calculator. Every page lists the documents it relies on, and our{" "}
              <Link href="/methodology#all-sources">methodology page</Link> lists them all.
            </li>
            <li>
              <strong>Official versus projected, said out loud.</strong> <StatusChip status="official" /> means the agency published it and it is
              final. <StatusChip status="projected" /> means it isn’t out yet, so we computed it from official inputs — the 2027 Part B premium of{" "}
              {moneySmart(partB27.value.premium)} a month, for example, comes from the Medicare Trustees Report until CMS publishes.{" "}
              <StatusChip status={IRS_2027_ADJUSTMENTS.status} /> means there is nothing reliable to show yet, so we don’t guess.
            </li>
            <li>
              <strong>No sign-up, no email gate.</strong> Every calculator works the moment the page loads. There are no accounts and no paid tier.
            </li>
            <li>
              <strong>The math runs in your browser.</strong> Calculators never ask for your name, Social Security number or account numbers, and
              there is no server doing the math. Your entries go into the page address so you can share a result, and our analytics sees that
              address and the result on your screen; our <Link href="/privacy">privacy policy</Link> spells out exactly what is recorded and how to
              opt out.
            </li>
            <li>
              <strong>Show the math.</strong> Every result has a “Show the math” panel with the exact table values and a link to the source, so you —
              or your accountant — can check it.
            </li>
            <li>
              <strong>Plain English, big type.</strong> Large text, large buttons, every acronym spelled out the first time. Retirement is
              complicated enough.
            </li>
          </ul>

          <h2>How is Sundial Years paid for?</h2>
          <p className="answer">
            By advertising. The site shows ads from Google AdSense once our account is approved, and that is the whole business model — no paid
            tier, no referral fees. We never sell your personal information, and we never pass your details to advisors, insurers or anyone who
            wants to market to you.
          </p>
          <ul>
            <li>Ads are labeled “Advertisement” and never sit above a calculator’s answer.</li>
            <li>No advertiser or partner can pay to change a number, a ranking or a recommendation on our pages.</li>
            <li>
              You can limit ad personalization at any time — see our <Link href="/cookies">cookie policy</Link>.
            </li>
          </ul>

          <h2>Who is behind Sundial Years?</h2>
          <p className="answer">
            {SITE.name} is an independent publisher of free retirement calculators. We are not a government agency, we are not affiliated with or
            endorsed by SSA, CMS, Medicare or the IRS, and we are not a financial firm — we don’t sell insurance, investments or advice.
          </p>
          <p>
            Rather than ask you to trust a name, we ask you to check us. Every page links to the documents its numbers came from, our{" "}
            <Link href="/methodology">methodology page</Link> explains how each one is verified and when it is updated, and the date the numbers were
            last re-checked — {longDate(SITE.dataVerifiedOn)} — appears at the top of every calculator.
          </p>

          <h2>What can you do here?</h2>
          <p className="answer">
            Work out the decisions that come with a date: when to claim Social Security, how much your RMD is, whether IRMAA will raise your
            Medicare bill, how much of your benefit is taxed, and what Medicare will cost next year.
          </p>
          <ul>
            {CALCULATORS.map((t) => (
              <li key={t.slug}>
                <Link href={`/${t.slug}`}>{t.title}</Link> — {t.blurb}
              </li>
            ))}
          </ul>
          <p>
            For quick lookups there are reference pages too, such as the{" "}
            {REFERENCES.slice(0, 3).map((t, i, arr) => (
              <span key={t.slug}>
                <Link href={`/${t.slug}`}>{t.navTitle}</Link>
                {i < arr.length - 2 ? ", " : i === arr.length - 2 ? " and " : ""}
              </span>
            ))}
            .
          </p>

          <h2>How can you help us get better?</h2>
          <p className="answer">
            Tell us when something looks wrong or confusing. Reader corrections are the fastest way a number gets fixed, and every message is read
            by a person. Suggestions are welcome too: if there’s a retirement question you can’t find a straight answer to, that’s the calculator we want to build next.
          </p>
          <p>
            {REPLY_PROMISE}. Use the <Link href="/contact?topic=number-looks-wrong">“a number looks wrong” form</Link> for errors, or{" "}
            <Link href="/contact?topic=suggestion">suggest a calculator</Link> you wish existed. You can also write to{" "}
            <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.
          </p>
        </ProseCard>

        <RelatedTools
          slugs={["social-security-break-even-calculator", "rmd-calculator", "irmaa-calculator"]}
          title="Start with the question on your mind"
        />
      </ContentSection>
    </>
  );
}
