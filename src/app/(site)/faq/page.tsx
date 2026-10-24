import type { Metadata } from "next";
import Link from "next/link";
import { TrustHero } from "@/components/site/contact/TrustHero";
import { REPLY_PROMISE } from "@/components/site/contact/topics";
import { UPDATE_TARGET } from "@/components/site/contact/policy";
import { ContentSection, ProseCard } from "@/components/tool/CalculatorShell";
import { Faq, type FaqItem } from "@/components/tool/Faq";
import { Feedback } from "@/components/tool/Feedback";
import { RelatedTools } from "@/components/tool/RelatedTools";
import { pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";
import { longDate, moneySmart } from "@/lib/format";
import { CALCULATORS } from "@/lib/tools";
import { COLA } from "@/data/params/social-security";
import { PART_B } from "@/data/params/medicare";

const PATH = "/faq";
/** Last time this page's text was reviewed. A constant — never the clock (pages are static). */
const UPDATED = "2026-10-23";
const TITLE = "FAQ: Free, Source-Cited Retirement Calculators, No Sign-Up";
const DESC =
  "Answers about Sundial Years: is it free, is what you type private, where numbers come from, what “projected” means, and how to report a number that looks wrong.";

export const metadata: Metadata = pageMetadata({ title: TITLE, description: DESC, path: PATH });

const FAQ: FaqItem[] = [
  {
    q: "Is Sundial Years really free?",
    a: "Yes. Every calculator and reference page is free, with no trial, no paid tier and nothing to unlock. The site is paid for by advertising from Google AdSense. We never sell your personal information, and no advertiser can pay to change a number, a result or a recommendation on our pages.",
  },
  {
    q: "Do I need to create an account or give my email address?",
    a: "No. There are no accounts and no sign-up, and no calculator asks for your name, email, phone number or Social Security number. Results appear as soon as the page loads. The only place we ask for an email address is the contact form, and only so we can answer you.",
  },
  {
    q: "Is what I type into a calculator private?",
    a: "The math runs in your own browser, and no calculator asks who you are. To make results shareable, your entries go into the page address. Our analytics records those addresses and the result on screen, tied to a random browser ID, not your name. Once ads run, we send Google the address without your entries, though its ad code could read them. Our privacy policy explains what is recorded and how to block it.",
  },
  {
    q: "Where do your numbers come from?",
    a: "Only from the bodies that set them: the Social Security Administration (SSA), the Centers for Medicare & Medicaid Services (CMS), the IRS, Treasury regulations, federal law and the Bureau of Labor Statistics, plus each state’s tax agency for state rules. Every page lists its sources, and every calculator has a Show the math panel with the exact table values it used.",
  },
  {
    q: "What does “Projected” mean next to a number?",
    a: `It means the agency hasn’t published the official figure yet, so we show a projection from official inputs. For example, the 2027 Medicare Part B premium of ${moneySmart(PART_B[2027].value.premium)} a month comes from the Medicare Trustees Report until CMS announces the real one. “Official” means final; “Not announced yet” means we don’t guess.`,
  },
  {
    q: "How current are the numbers?",
    a: `Every figure was last checked against the primary sources on ${longDate(SITE.dataVerifiedOn)}; that date appears at the top of every calculator. Social Security announced the ${COLA[2027].value}% cost-of-living adjustment for 2027 in October, and Medicare premiums usually follow in November. We aim to update ${UPDATE_TARGET} of each announcement.`,
  },
  {
    q: "Can I rely on the results to make a decision?",
    a: "Use them to understand your options and to prepare good questions. They are educational estimates built on the official rules, not personal financial, tax or legal advice. Before an irreversible step, such as claiming Social Security, confirm the figures with the agency or a qualified professional who knows your whole situation.",
  },
  {
    q: "Are you part of Social Security, Medicare or the IRS?",
    a: "No. Sundial Years is an independent website. We are not a government agency and are not affiliated with or endorsed by SSA, CMS, Medicare or the IRS. We also don’t sell insurance or investments, and we don’t pass your details to anyone who does.",
  },
  {
    q: "I think a number is wrong. What should I do?",
    a: `Please tell us through the contact form and choose the topic “A number looks wrong”. Tell us the page, the number you see and what you expected, and include a link to the official figure if you have one. A person checks every report against the primary source. ${REPLY_PROMISE}.`,
  },
  {
    q: "Can I share or print my results?",
    a: "Yes. Under each result, “Copy link to my results” gives you a link that reopens the calculator with your exact entries, which is handy for a spouse or an accountant. “Print or save PDF” prints a clean copy. Keep in mind that anyone with the link can see the entries in it.",
  },
];

export default function FaqPage() {
  return (
    <>
      <TrustHero
        crumbs={[{ name: "FAQ", path: PATH }]}
        eyebrow="Questions about the site"
        icon="info"
        title={
          <>
            Questions people ask <span className="italic font-normal text-sun-ink">about {SITE.name}</span>
          </>
        }
        lead={
          <p>
            Short version: it’s free, there’s no sign-up, the math runs in your browser, and every number comes from SSA, CMS, the IRS or another
            official source, with a link to prove it. The details are below.
          </p>
        }
        updated={UPDATED}
        showVerified
      />

      <ContentSection className="space-y-10">
        <Faq items={FAQ} title="About Sundial Years" />

        <ProseCard>
          <h2 className="!mt-0">Looking for a question about Social Security, Medicare or RMDs?</h2>
          <p className="answer">
            Each calculator has its own questions and answers at the bottom of its page — about claiming ages, IRMAA, required minimum distributions
            and taxes on benefits. Start with the tool closest to your question; its answer and the rule behind it are usually on the first
            screen.
          </p>
          <ul>
            {CALCULATORS.map((t) => (
              <li key={t.slug}>
                <Link href={`/${t.slug}`}>{t.title}</Link> — {t.blurb}
              </li>
            ))}
          </ul>
          <p>
            Still stuck? <Link href="/contact?topic=question">Send us your question</Link> — {REPLY_PROMISE.toLowerCase()}. To see how we check
            every figure, read our <Link href="/methodology">methodology</Link>; for what we collect, read the{" "}
            <Link href="/privacy">privacy policy</Link>.
          </p>
        </ProseCard>

        <Feedback />

        <RelatedTools slugs={["social-security-break-even-calculator", "medicare-premium-calculator", "rmd-calculator"]} title="Popular calculators" />
      </ContentSection>
    </>
  );
}
