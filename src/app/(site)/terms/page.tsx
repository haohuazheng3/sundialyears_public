import type { Metadata } from "next";
import Link from "next/link";
import { TrustHero } from "@/components/site/contact/TrustHero";
import { OnThisPage } from "@/components/site/contact/OnThisPage";
import { POLICY_EFFECTIVE } from "@/components/site/contact/policy";
import { REPLY_PROMISE } from "@/components/site/contact/topics";
import { ContentSection, ProseCard } from "@/components/tool/CalculatorShell";
import { StatusChip } from "@/components/tool/StatusChip";
import { JsonLd } from "@/components/site/JsonLd";
import { ORG_ID, pageMetadata } from "@/lib/seo";
import { SITE, absoluteUrl } from "@/lib/site";
import { longDate } from "@/lib/format";

const PATH = "/terms";
/** Last time this page's text was reviewed. A constant — never the clock (pages are static). */
const UPDATED = POLICY_EFFECTIVE;
const TITLE = "Terms of Use: Educational Information, Not Advice";
const DESC =
  "The terms for using Sundial Years: educational estimates, not financial, tax or legal advice; how we correct errors; acceptable use; and our liability limits.";

export const metadata: Metadata = pageMetadata({ title: TITLE, description: DESC, path: PATH });

const TOC = [
  { id: "agreement", label: "Using the site" },
  { id: "not-advice", label: "Information, not advice" },
  { id: "accuracy", label: "Accuracy and corrections" },
  { id: "use", label: "Acceptable use" },
  { id: "ownership", label: "Who owns what" },
  { id: "links", label: "Links and ads" },
  { id: "liability", label: "Limits of liability" },
  { id: "law", label: "Governing law" },
  { id: "changes", label: "Changes and contact" },
];

const H2 = "scroll-mt-28";

export default function TermsPage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: TITLE,
          url: absoluteUrl(PATH),
          description: DESC,
          dateModified: UPDATED,
          publisher: { "@id": ORG_ID },
          inLanguage: "en-US",
        }}
      />
      <TrustHero
        crumbs={[{ name: "Terms of use", path: PATH }]}
        eyebrow="Terms of use"
        icon="source"
        title={
          <>
            Terms of use, <span className="italic font-normal text-sun-ink">without the fine-print games</span>
          </>
        }
        lead={
          <p>
            The essentials: {SITE.name} is free educational information, not personal advice. We work hard to get every number right and fix
            mistakes fast, but decisions are yours — confirm them with the agency or a professional before you act.
          </p>
        }
        updated={UPDATED}
        updatedLabel="Effective"
      />

      <ContentSection className="space-y-10">
        <OnThisPage items={TOC} />

        <ProseCard>
          <h2 id="agreement" className={`${H2} !mt-0`}>
            What are you agreeing to by using the site?
          </h2>
          <p className="answer">
            These terms, and our <Link href="/privacy">privacy policy</Link>. They apply to everyone who uses {SITE.domain} (“{SITE.name}”, “we”,
            “us”). If you don’t agree with them, please don’t use the site. There is nothing to sign and no account to create — using the site is
            agreement enough.
          </p>

          <h2 id="not-advice" className={H2}>
            Is Sundial Years financial, tax or legal advice?
          </h2>
          <p className="answer">
            No. Our calculators and articles are general educational information built on official rules. They are not financial, investment, tax,
            legal, insurance or Medicare enrollment advice, and they don’t take your whole situation into account — your health, your family, your
            other savings.
          </p>
          <ul>
            <li>
              Using the site does not create a client, advisor, fiduciary or any other professional relationship between you and {SITE.name}.
            </li>
            <li>
              We are not a government agency and are not affiliated with or endorsed by the Social Security Administration, the Centers for
              Medicare &amp; Medicaid Services, Medicare or the IRS.
            </li>
            <li>
              Before a decision that is hard to undo — claiming Social Security, choosing a Medicare plan, withdrawing from a retirement account —
              confirm the figures with the agency or a qualified professional.
            </li>
          </ul>

          <h2 id="accuracy" className={H2}>
            How accurate is the information, and what happens when it’s wrong?
          </h2>
          <p className="answer">
            We take every figure from primary sources and check it independently, but we can’t promise the site is free of errors or up to the
            minute. Results are estimates that depend on what you enter, and agencies change rules and amounts every year.
          </p>
          <ul>
            <li>
              Figures marked <StatusChip status="projected" /> or <StatusChip status="not_yet_announced" /> are not final. Don’t treat a projection
              as a promise.
            </li>
            <li>
              Your own records — your Social Security statement, your Medicare notices, your tax return — take precedence over anything on this
              site.
            </li>
            <li>
              <strong>Our correction policy:</strong> if you find an error, <Link href="/contact?topic=number-looks-wrong">tell us</Link>. A person
              checks it against the primary source, and confirmed errors are fixed across the whole site at once. {REPLY_PROMISE}. Our{" "}
              <Link href="/methodology">methodology page</Link> explains how numbers are checked and updated.
            </li>
          </ul>

          <h2 id="use" className={H2}>
            What may you do with the site?
          </h2>
          <p className="answer">
            Use it, share it and print it for yourself, your family and the people who help you — that is what it’s for. Linking to any page is
            welcome. What you may not do is misuse it or pass it off as your own.
          </p>
          <p>Please don’t:</p>
          <ul>
            <li>copy pages or tools in bulk, or republish them as your own;</li>
            <li>run automated scraping that slows the site down for other people, or try to get around our rate limits;</li>
            <li>probe, attack or try to break into the site, its database or its admin pages;</li>
            <li>send spam, malware or abusive messages through the contact or feedback forms;</li>
            <li>frame the site inside another site, or present our results in a way that suggests we endorse you or your product;</li>
            <li>use the site for anything illegal or to mislead others.</li>
          </ul>
          <p>We may block access for anyone who does, and we may change, pause or remove any part of the site at any time.</p>

          <h2 id="ownership" className={H2}>
            Who owns the content?
          </h2>
          <p className="answer">
            The official figures belong to everyone — U.S. government data is in the public domain. Our writing, explanations, design, code and
            graphics belong to {SITE.name} and are protected by copyright. Quoting a little with a link is fine; copying a lot is not.
          </p>
          <p>
            You’re welcome to quote a short passage with a link back to the page it came from. For anything more — reprinting an article, embedding
            a calculator, using our tables in a product — <Link href="/contact?topic=partnership">ask us first</Link>. The official figures
            themselves you can always take straight from the agency documents we link to. The {SITE.name} name and logo may not be used to suggest a
            connection we don’t have.
          </p>

          <h2 id="links" className={H2}>
            What about links to other sites and the ads?
          </h2>
          <p className="answer">
            We link to official sources so you can check our work, and we show ads to keep the site free. We don’t control other websites or the
            ads Google selects, we aren’t responsible for what they say or do, and an ad is never an endorsement.
          </p>
          <p>
            Other sites have their own terms and privacy policies. Be careful with any ad or website that asks for your Social Security number,
            Medicare number or bank details — no legitimate reason to use our calculators requires them.
          </p>

          <h2 id="liability" className={H2}>
            What are the limits of our liability?
          </h2>
          <p className="answer">
            The site is free and provided “as is”. To the fullest extent the law allows, we aren’t liable for losses that come from relying on it,
            and our total liability for any claim is limited to one hundred U.S. dollars.
          </p>
          <ul>
            <li>
              We make no warranties, express or implied — including that the site will be accurate, complete, uninterrupted or fit for a particular
              purpose.
            </li>
            <li>
              We are not liable for indirect, incidental, special or consequential damages, or for lost benefits, penalties, premiums, taxes or
              investment losses that follow from decisions made using the site.
            </li>
            <li>
              Some states don’t allow certain warranty exclusions or liability limits, so some of these may not apply to you. Nothing here limits
              rights you have under laws that can’t be waived.
            </li>
          </ul>

          <h2 id="law" className={H2}>
            Which law applies?
          </h2>
          <p className="answer">
            These terms are governed by the laws of the United States and of the U.S. state where {SITE.name} is operated, without regard to
            conflict-of-law rules. If you live in the U.S., nothing here takes away protections your own state’s consumer laws give you.
          </p>
          <p>
            Before any formal dispute, please write to us — most problems are solved with one email. If part of these terms is found
            unenforceable, the rest still applies. Not enforcing a term right away doesn’t mean we’ve given it up.
          </p>

          <h2 id="changes" className={H2}>
            Can these terms change, and how do you reach us?
          </h2>
          <p className="answer">
            Yes. When we change them we update this page and the effective date at the top, and the new terms apply from then on. Using the site
            after a change means you accept the updated terms. A change never applies to something that happened before it.
          </p>
          <p>
            Questions about these terms: <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a> or our{" "}
            <Link href="/contact?topic=other">contact form</Link>. These terms are effective{" "}
            <time dateTime={POLICY_EFFECTIVE}>{longDate(POLICY_EFFECTIVE)}</time>.
          </p>
        </ProseCard>
      </ContentSection>
    </>
  );
}
