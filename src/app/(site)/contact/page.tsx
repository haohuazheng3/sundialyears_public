import type { Metadata } from "next";
import Link from "next/link";
import { TrustHero } from "@/components/site/contact/TrustHero";
import { ContactForm } from "@/components/site/contact/ContactForm";
import { CONTACT_TOPICS, REPLY_PROMISE } from "@/components/site/contact/topics";
import { RETENTION } from "@/components/site/contact/policy";
import { ContentSection, ProseCard } from "@/components/tool/CalculatorShell";
import { JsonLd } from "@/components/site/JsonLd";
import { Icon } from "@/components/ui/Icon";
import { ORG_ID, organizationLd, pageMetadata } from "@/lib/seo";
import { SITE, absoluteUrl } from "@/lib/site";

const PATH = "/contact";
/** Last time this page's text was reviewed. A constant — never the clock (pages are static). */
const UPDATED = "2026-10-23";
const TITLE = "Contact Us: Questions, Corrections and Calculator Ideas";
const DESC = `Email ${SITE.contactEmail} or use the form to ask a question, report a number that looks wrong or suggest a calculator. ${REPLY_PROMISE}.`;

export const metadata: Metadata = pageMetadata({ title: TITLE, description: DESC, path: PATH });

export default function ContactPage() {
  return (
    <>
      <JsonLd
        data={[
          organizationLd(),
          {
            "@context": "https://schema.org",
            "@type": "ContactPage",
            name: `Contact ${SITE.name}`,
            url: absoluteUrl(PATH),
            description: DESC,
            dateModified: UPDATED,
            mainEntity: { "@id": ORG_ID },
            inLanguage: "en-US",
          },
        ]}
      />
      <TrustHero
        crumbs={[{ name: "Contact", path: PATH }]}
        eyebrow="Contact us"
        icon="mail"
        title={
          <>
            Write to us — <span className="italic font-normal text-sun-ink">a person reads every message</span>
          </>
        }
        lead={
          <p>
            Email <a className="link font-semibold" href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a> or use the form below.{" "}
            {REPLY_PROMISE}. If a number on the site looks wrong, please tell us — that’s the message we most want to get.
          </p>
        }
        updated={UPDATED}
      />

      <ContentSection className="space-y-10">
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] lg:gap-6">
          <section aria-labelledby="form-h" className="float p-5 sm:p-8">
            <h2 id="form-h" className="mb-6 text-[1.75rem] font-semibold leading-tight">
              Send us a message
            </h2>
            <ContactForm />
          </section>

          <aside aria-label="Other ways to reach us" className="space-y-5 lg:sticky lg:top-24">
            <div className="float-soft p-6">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-sun-wash text-sun-ink">
                <Icon name="mail" size={21} />
              </span>
              <h2 className="mt-4 text-[1.3rem] font-semibold">Prefer email?</h2>
              <p className="mt-2 text-[1.0625rem] leading-relaxed text-ink-2">
                Write to{" "}
                <a className="link break-all font-semibold" href={`mailto:${SITE.contactEmail}`}>
                  {SITE.contactEmail}
                </a>{" "}
                from any email program. Same people, same promise: {REPLY_PROMISE.toLowerCase()}.
              </p>
            </div>

            <div className="float-soft p-6">
              <h2 className="text-[1.3rem] font-semibold">What we can help with</h2>
              <ul className="mt-3 space-y-2 text-[1.0625rem] leading-relaxed text-ink-2">
                {CONTACT_TOPICS.map((t) => (
                  <li key={t.value} className="flex gap-2">
                    <Icon name="check" size={18} className="mt-1 shrink-0 text-sage" />
                    <span>{t.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="float-soft p-6">
              <h2 className="flex items-center gap-2 text-[1.3rem] font-semibold">
                <Icon name="info" size={20} className="text-sun-ink" /> What we can’t do
              </h2>
              <p className="mt-2 text-[1.0625rem] leading-relaxed text-ink-2">
                We can’t look up your Social Security or Medicare record, change a benefit or a premium, or give personal financial advice. For your
                own record, contact SSA at <a className="link" href="https://www.ssa.gov" target="_blank" rel="noopener">ssa.gov</a> or Medicare
                at <a className="link" href="https://www.medicare.gov" target="_blank" rel="noopener">medicare.gov</a>.
              </p>
            </div>
          </aside>
        </div>

        <ProseCard>
          <h2 className="!mt-0">What happens after you send a message?</h2>
          <p className="answer">
            It is saved in our database and emailed to our inbox, and a person reads it. {REPLY_PROMISE}, by email, to the address you gave — so
            check your spam folder if nothing arrives. Reports of a wrong number are checked against the official source before anything on the
            site changes.
          </p>
          <p>
            We use your email address only to answer you — no newsletter, no mailing list, never shared with advertisers. We keep messages for{" "}
            {RETENTION.contactMonths} months so we can follow up on a correction, then delete them. The <Link href="/privacy">privacy policy</Link>{" "}
            has the details, including what our analytics tool records when you submit a form.
          </p>

          <h2>What should you leave out?</h2>
          <p className="answer">
            Anything we don’t need to answer you: your Social Security number, Medicare number, bank or brokerage account numbers, passwords, or
            copies of tax returns. To ask about a result, send the calculator’s “Copy link to my results” link instead — it shows us exactly what
            you saw.
          </p>
          <p>
            Email isn’t a secure channel for identity documents, and we never need them. If someone claiming to be from {SITE.name} asks you for
            any of these, it isn’t us.
          </p>

          <h2>Want an answer right now?</h2>
          <p className="answer">
            Many questions are already answered in our <Link href="/faq">FAQ</Link>, on the <Link href="/methodology">methodology page</Link>, or
            in the questions at the bottom of each calculator. For your personal record — benefit amounts, premiums, notices, letters — only SSA
            and Medicare can look it up for you.
          </p>
        </ProseCard>
      </ContentSection>
    </>
  );
}
