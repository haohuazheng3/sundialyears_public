import type { Metadata } from "next";
import Link from "next/link";
import { TrustHero } from "@/components/site/contact/TrustHero";
import { CookieChoice } from "@/components/site/contact/CookieChoice";
import { EXTERNAL, OWNER_COOKIE_DAYS, POLICY_EFFECTIVE, STORAGE_KEYS } from "@/components/site/contact/policy";
import { ContentSection, ProseCard } from "@/components/tool/CalculatorShell";
import { JsonLd } from "@/components/site/JsonLd";
import { ORG_ID, pageMetadata } from "@/lib/seo";
import { SITE, absoluteUrl } from "@/lib/site";
import { longDate } from "@/lib/format";

const PATH = "/cookies";
/** Last time this page's text was reviewed. A constant — never the clock (pages are static). */
const UPDATED = POLICY_EFFECTIVE;
const TITLE = "Cookie Policy: Every Cookie and Storage Key We Use";
const DESC =
  "Every cookie and browser storage key on Sundial Years — your consent choice, FlowGlance analytics, owner-only cookies and Google AdSense — and how to change it.";

export const metadata: Metadata = pageMetadata({ title: TITLE, description: DESC, path: PATH });

const ext = { target: "_blank", rel: "noopener" } as const;

type Row = { name: string; kind: string; by: string; purpose: React.ReactNode; lasts: string; who: string };

const ROWS: Row[] = [
  {
    name: STORAGE_KEYS.consent,
    kind: "Local storage",
    by: SITE.name,
    purpose: "Remembers your answer to the cookie notice (Accept all or Essential only) and the date you chose, so we don’t ask again.",
    lasts: "Until you clear it",
    who: "Everyone who makes a choice",
  },
  {
    name: STORAGE_KEYS.fwVisitor,
    kind: "Local storage",
    by: "FlowGlance (analytics)",
    purpose: "A random visitor ID, so analytics can tell a returning visitor from a new one. Contains no name or email. The box above shows yours, so you can quote it if you ask us to delete your analytics data.",
    lasts: "Until you clear this site’s data",
    who: "Every visitor",
  },
  {
    name: STORAGE_KEYS.fwSession,
    kind: "Session storage",
    by: "FlowGlance (analytics)",
    purpose: "A random ID for the current visit, so the pages you view are grouped into one journey.",
    lasts: "Until you close the tab",
    who: "Every visitor",
  },
  {
    name: STORAGE_KEYS.fwLastActivity,
    kind: "Session storage",
    by: "FlowGlance (analytics)",
    purpose: "The time of your last activity, so a visit ends after a period of inactivity.",
    lasts: "Until you close the tab",
    who: "Every visitor",
  },
  {
    name: STORAGE_KEYS.fwExclude,
    kind: "Cookie",
    by: SITE.name,
    purpose: "Tells FlowGlance to leave the site owner’s own visits out of the statistics.",
    lasts: `${OWNER_COOKIE_DAYS.fwExclude} days`,
    who: "Only the site owner’s browser",
  },
  {
    name: STORAGE_KEYS.admin,
    kind: "Cookie (secure, not readable by scripts)",
    by: SITE.name,
    purpose: "Keeps the site owner signed in to the private admin pages.",
    lasts: `${OWNER_COOKIE_DAYS.admin} days`,
    who: "Only the site owner’s browser",
  },
  {
    name: "Google AdSense cookies (for example __gads, __gpi)",
    kind: "Cookies",
    by: "Google and its advertising partners",
    purpose: (
      <>
        Show ads, limit how often you see the same one, prevent fraud and count results; also personalize ads if you choose Accept all. See{" "}
        <a className="link" href={EXTERNAL.googleAdsCookies} {...ext}>
          Google’s list of advertising cookies
        </a>
        .
      </>
    ),
    lasts: "Set by Google; see its list",
    who: "Every visitor, while ads are running",
  },
];

export default function CookiesPage() {
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
        crumbs={[{ name: "Cookie policy", path: PATH }]}
        eyebrow="Cookie policy"
        icon="shield"
        title={
          <>
            Every cookie we use, <span className="italic font-normal text-sun-ink">and how to change your choice</span>
          </>
        }
        lead={
          <p>
            {SITE.name} keeps very little in your browser: your cookie choice, our analytics IDs and, while ads are running, Google’s advertising
            cookies. Here is the complete list, and a button to change your mind.
          </p>
        }
        updated={UPDATED}
        updatedLabel="Effective"
      />

      <ContentSection className="space-y-10">
        <section aria-labelledby="choice-h" className="float p-6 sm:p-8">
          <h2 id="choice-h" className="text-[1.75rem] font-semibold leading-tight">
            Change your cookie choice
          </h2>
          <p className="mt-2 max-w-3xl text-[1.0625rem] leading-relaxed text-ink-2">
            Your choice is saved only in this browser, under the key <code>{STORAGE_KEYS.consent}</code>. Clearing it brings the cookie notice back so
            you can choose again.
          </p>
          <div className="mt-5">
            <CookieChoice />
          </div>
        </section>

        <ProseCard>
          <h2 className="!mt-0">What are cookies and browser storage?</h2>
          <p className="answer">
            Small pieces of information a website saves in your browser. Cookies are sent back to the website with each visit; local storage and
            session storage stay in your browser for scripts on the page to read. Session storage disappears when you close the tab.
          </p>
          <p>
            We list all three here, because what matters to you is what is kept and why — not the technical name. None of them holds your name,
            email address or calculator entries.
          </p>

          <h2>What does each choice do?</h2>
          <p className="answer">
            “Accept all” allows personalized ads. “Essential only” means we ask Google for non-personalized ads only. Either way, every calculator
            works exactly the same, nothing is blocked or hidden, and your choice can be changed at any time with the button above.
          </p>
          <ul>
            <li>
              <strong>Essential only</strong> still lets Google use cookies for non-personalized ads — to cap how often you see an ad, prevent fraud
              and count results — but not to tailor ads to your interests.
            </li>
            <li>
              <strong>Global Privacy Control:</strong> if your browser sends a{" "}
              <a href={EXTERNAL.gpc} {...ext}>
                GPC
              </a>{" "}
              signal, we treat it as Essential only, whatever you clicked.
            </li>
            <li>
              <strong>Analytics:</strong> your choice does not switch off FlowGlance, which we use on every visit to find bugs and confusing pages.
              The <Link href="/privacy#analytics">privacy policy</Link> explains exactly what it records and how to block it.
            </li>
            <li>
              <strong>Before ads start:</strong> while our ads are not yet running, your choice simply stops the notice from reappearing.
            </li>
          </ul>
        </ProseCard>

        <section aria-labelledby="list-h" className="float overflow-hidden p-0">
          <h2 id="list-h" className="px-6 pb-2 pt-6 text-[1.75rem] font-semibold leading-tight sm:px-8 sm:pt-8">
            The complete list
          </h2>
          <p className="px-6 pb-4 text-[1.0625rem] text-ink-3 sm:px-8">Swipe sideways on a phone to see every column.</p>
          <div className="overflow-x-auto">
            <table className="table-sy text-[1rem]">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Type</th>
                  <th scope="col">Set by</th>
                  <th scope="col">Why</th>
                  <th scope="col">How long</th>
                  <th scope="col">Who gets it</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r) => (
                  <tr key={r.name}>
                    <th scope="row" className="strong !static min-w-[10rem] !text-[1rem] !normal-case !tracking-normal">
                      <code className="break-words">{r.name}</code>
                    </th>
                    <td className="min-w-[9rem]">{r.kind}</td>
                    <td className="min-w-[9rem]">{r.by}</td>
                    <td className="min-w-[18rem]">{r.purpose}</td>
                    <td className="min-w-[9rem]">{r.lasts}</td>
                    <td className="min-w-[10rem]">{r.who}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <ProseCard>
          <h2 className="!mt-0">How do you clear everything?</h2>
          <p className="answer">
            Clear this site’s data in your browser’s settings — usually under Privacy, then Cookies and site data — or use a private window, which
            forgets everything when you close it. The calculators work fine either way; you’ll just see the cookie notice again.
          </p>
          <ul>
            <li>
              To turn off personalized ads from Google on every site, use{" "}
              <a href={EXTERNAL.googleAdsSettings} {...ext}>
                Google’s Ads Settings
              </a>
              . Many other ad companies offer an opt-out at{" "}
              <a href={EXTERNAL.aboutAdsOptOut} {...ext}>
                aboutads.info
              </a>
              .
            </li>
            <li>
              Clearing site data also resets FlowGlance’s visitor ID, so your next visit counts as a new visitor.
            </li>
          </ul>
          <p>
            Questions? Read our <Link href="/privacy">privacy policy</Link> or <Link href="/contact?topic=other">write to us</Link>. This cookie
            policy is effective <time dateTime={POLICY_EFFECTIVE}>{longDate(POLICY_EFFECTIVE)}</time>.
          </p>
        </ProseCard>
      </ContentSection>
    </>
  );
}
