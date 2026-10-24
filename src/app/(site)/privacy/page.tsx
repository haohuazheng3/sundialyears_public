import type { Metadata } from "next";
import Link from "next/link";
import { TrustHero } from "@/components/site/contact/TrustHero";
import { OnThisPage } from "@/components/site/contact/OnThisPage";
import { CHILD_AGE, EXTERNAL, POLICY_EFFECTIVE, PRIVACY_REQUEST_DAYS, RETENTION, STORAGE_KEYS } from "@/components/site/contact/policy";
import { REPLY_PROMISE } from "@/components/site/contact/topics";
import { ContentSection, ProseCard } from "@/components/tool/CalculatorShell";
import { JsonLd } from "@/components/site/JsonLd";
import { ORG_ID, pageMetadata } from "@/lib/seo";
import { SITE, absoluteUrl } from "@/lib/site";
import { longDate } from "@/lib/format";

const PATH = "/privacy";
/** Last time this page's text was reviewed. A constant — never the clock (pages are static). */
const UPDATED = POLICY_EFFECTIVE;
const TITLE = "Privacy Policy: What Sundial Years Collects and Why";
const DESC =
  "Plain-English privacy policy: no accounts, calculators run in your browser, what our analytics records, how ads and cookies work, and how to opt out.";

export const metadata: Metadata = pageMetadata({ title: TITLE, description: DESC, path: PATH });

const TOC = [
  { id: "short-version", label: "The short version" },
  { id: "calculators", label: "What you type into calculators" },
  { id: "analytics", label: "Analytics (FlowGlance)" },
  { id: "messages", label: "Contact form, feedback and error reports" },
  { id: "advertising", label: "Advertising (Google AdSense)" },
  { id: "providers", label: "Companies that handle data for us" },
  { id: "sale", label: "Selling and “sharing”" },
  { id: "retention", label: "How long we keep things" },
  { id: "rights", label: "Your rights" },
  { id: "children", label: "Children" },
  { id: "security", label: "Security" },
  { id: "changes", label: "Changes and contact" },
];

const H2 = "scroll-mt-28";
const ext = { target: "_blank", rel: "noopener" } as const;

export default function PrivacyPage() {
  const mail = <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>;
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
        crumbs={[{ name: "Privacy policy", path: PATH }]}
        eyebrow="Privacy policy"
        icon="shield"
        title={
          <>
            Your privacy, <span className="italic font-normal text-sun-ink">in plain English</span>
          </>
        }
        lead={
          <p>
            {SITE.name} has no accounts and never asks who you are. The calculators run in your browser. We do use an analytics tool, we will show
            ads, and we store the messages you send us — this page says exactly what is collected, by whom, for how long, and how to say no.
          </p>
        }
        updated={UPDATED}
        updatedLabel="Effective"
      />

      <ContentSection className="space-y-10">
        <OnThisPage items={TOC} />

        <ProseCard>
          <p>
            This policy covers {SITE.domain} (“{SITE.name}”, “we”, “us”). It applies to everyone who visits, and it is written for people, not
            lawyers. Where we use a legal term, we explain it.
          </p>

          <h2 id="short-version" className={H2}>
            What is the short version?
          </h2>
          <p className="answer">
            No accounts, no sign-up, and we never ask for your name, Social Security number or account numbers to run a calculator. We collect
            usage analytics, the messages you choose to send us, and error reports; ads come from Google. We don’t sell your personal information.
          </p>
          <ul>
            <li>
              Calculator math happens on your device. Your entries are placed in the page address so links can be shared, and our analytics
              records that address — details below.
            </li>
            <li>
              Our analytics tool, FlowGlance, records page views, clicks, scrolling and the path you take through the site, the main text of the
              pages you see (on a calculator, that includes the result) and the text of forms you submit to us, such as the contact form.
            </li>
            <li>Contact messages and feedback are stored in our database and emailed to us so a person can answer.</li>
            <li>Advertising comes from Google AdSense. You can limit ad personalization, and we honor Global Privacy Control.</li>
            <li>You can ask us what we hold about you, or to delete it, by writing to {mail}.</li>
          </ul>

          <h2 id="calculators" className={H2}>
            What happens to what you type into a calculator?
          </h2>
          <p className="answer">
            The calculation runs in your own browser; there is no “submit” and no server doing the math. So that you can refresh, bookmark or share
            a result, the page also writes your entries into its address — the part after the “?”, such as a birth date or an account balance.
          </p>
          <p>Here is where that address can go:</p>
          <ul>
            <li>
              <strong>You open or reload a page with entries in the address</strong> — for example a link someone shared with you. Like every
              website, our hosting provider (Vercel) receives the full address of each page requested and may keep it briefly in its logs.
            </li>
            <li>
              <strong>Our analytics records it as you go.</strong> FlowGlance records the address of each page you view, and records it again
              each time the address changes — so it receives your calculator entries as you type them. It also keeps a copy of the page’s main
              text as it appears on your screen, which on a calculator includes the result shown at that moment, and the options you pick from
              menus and buttons (a filing status, for example). All of it is linked to a random browser ID, not to your name.
            </li>
            <li>
              <strong>Ads, once they are running.</strong> When a page asks Google for an ad, we give Google the page address with your entries
              removed. Google’s ad code still runs inside the page, though, so — as on any site that shows Google ads — it is able to read the full
              address.
            </li>
            <li>
              <strong>Something breaks.</strong> If a page hits an error, your browser sends us an automatic error report that includes the page
              address and your browser type, so we can fix the bug.
            </li>
            <li>
              <strong>You share the link.</strong> Anyone you send it to can see the entries in it.
            </li>
          </ul>
          <p>
            Calculators never ask for your name or other identifying details, so none of this says who you are — unless you also send us the
            contact form from the same browser, because FlowGlance files that message, with your email address, under the same browser ID. A
            private browsing window does not stop any of this. A content blocker that blocks flowglance.com and Google ads does, and every
            calculator still works with it switched on.
          </p>

          <h2 id="analytics" className={H2}>
            What does our analytics tool record?
          </h2>
          <p className="answer">
            We use one analytics service, FlowGlance, on every page. It records how the site is used — page views, clicks, scrolling and the journey
            from page to page — and, because we have its detailed capture turned on, the main text of the pages you see and what you type into
            forms you submit to us.
          </p>
          <ul>
            <li>
              <strong>Usage:</strong> pages viewed (including their full address, every time it changes), links and buttons clicked, the options
              you choose in menus, checkboxes and option buttons, which headings you scroll past, how far you scroll, how long you stay, the order
              of pages in your visit, the first few words of any text you copy from a page, and errors your browser runs into. It also receives the technical details any website gets — browser and device type, screen size, the page that
              referred you — and may estimate your general location from your IP address.
            </li>
            <li>
              <strong>Page text:</strong> because detailed capture is on, a copy of the main text of each page as it appears on your screen. On a
              calculator page that includes the result shown at that moment.
            </li>
            <li>
              <strong>Form text:</strong> when you start filling in a form and when you send it, and — because detailed capture is on — what you
              wrote in it (the first few hundred characters of each box). Today that means the contact form and the optional comment in “Did this
              answer your question?”. FlowGlance skips password, hidden and file fields, and boxes whose internal name suggests a card number, PIN,
              Social Security number or bank routing number. If a page ever let you upload an image, a reduced copy would be captured too; no page on
              the site asks you to upload anything.
            </li>
            <li>
              <strong>Identifiers:</strong> FlowGlance stores a random visitor ID in your browser’s local storage (<code>{STORAGE_KEYS.fwVisitor}</code>)
              and a session ID and last-activity time in session storage (<code>{STORAGE_KEYS.fwSession}</code>, <code>{STORAGE_KEYS.fwLastActivity}</code>)
              so it can tell one visit from the next. These are not cookies and contain no name or email.
            </li>
          </ul>
          <p>
            We use this to find confusing pages and bugs, and to see which calculators people actually use. We sometimes look at individual
            journeys, never to identify you — we have no way to, unless you tell us who you are in a message. We don’t use Google Analytics or any
            other analytics or session-recording service. Your choice in our cookie notice controls advertising; it does not switch FlowGlance off.
            If you don’t want to be counted, a content blocker that blocks <a href={EXTERNAL.flowglance} {...ext}>flowglance.com</a> will stop it,
            and the site works normally without it.
          </p>

          <h2 id="messages" className={H2}>
            What happens when you contact us, leave feedback, or a page breaks?
          </h2>
          <p className="answer">
            Contact messages and feedback are stored in our database, which is hosted by Neon, a cloud database service, and contact messages are
            also emailed to our inbox so a person can reply. Error reports are stored the same way. We use them only to answer you and to improve
            the site.
          </p>
          <ul>
            <li>
              <strong>Contact form:</strong> your email address, your name if you give it, the topic, your message, the page you came from (only if
              you leave that box ticked), your browser type, and a one-way scrambled code (a salted hash) of your IP address that we use to stop
              spam. We don’t store the IP address itself, and we don’t use the code to work out who you are. The message is delivered to our
              mailbox through Cloudflare’s email service.
            </li>
            <li>
              <strong>Feedback (“Did this answer your question?”):</strong> the page, your yes or no, your optional comment, and the same scrambled IP
              code.
            </li>
            <li>
              <strong>Error reports:</strong> the error, the page address (which can include calculator entries) and your browser type.
            </li>
          </ul>
          <p>
            We use your email address only to reply. No newsletter, no mailing list, and it is never given to advertisers. Please don’t send us your
            Social Security number, Medicare number or account numbers — we never need them.
          </p>

          <h2 id="advertising" className={H2}>
            How does advertising work on this site?
          </h2>
          <p className="answer">
            Ads keep {SITE.name} free. We use Google AdSense, and while ads are running, Google and its partners use cookies to show ads and measure
            them. You decide whether those ads may be personalized to your interests, and the calculators work the same either way.
          </p>
          <ul>
            <li>
              Third-party vendors, including Google, use cookies to serve ads based on your previous visits to this website and other websites.
            </li>
            <li>
              Google’s advertising cookies let it and its partners serve ads to you based on your visits to this site and other sites on the
              internet. See <a href={EXTERNAL.googlePartnerSites} {...ext}>how Google uses information from sites that use its services</a> and{" "}
              <a href={EXTERNAL.googleAdsCookies} {...ext}>the advertising cookies Google uses</a>.
            </li>
            <li>
              <strong>Personalized ads</strong> (if you choose “Accept all”) are based on your interests and past browsing.{" "}
              <strong>Non-personalized ads</strong> (if you choose “Essential only”) are based on general context such as the page you are reading and
              your approximate location; Google still uses cookies for them to limit how often you see an ad, prevent fraud and count results.
            </li>
            <li>
              You can turn off personalized ads from Google everywhere in{" "}
              <a href={EXTERNAL.googleAdsSettings} {...ext}>Google’s Ads Settings</a>, and from many other ad companies at{" "}
              <a href={EXTERNAL.aboutAdsOptOut} {...ext}>aboutads.info</a> or the <a href={EXTERNAL.naiOptOut} {...ext}>NAI opt-out page</a>.
            </li>
            <li>
              Change your choice for this site any time on our <Link href="/cookies">cookie policy page</Link>.
            </li>
          </ul>
          <p>
            We never give advertisers your messages or your email address. When a page asks Google for an ad, it tells Google the page address
            with your calculator entries removed — but Google’s ad code runs inside the page and could still read them (see{" "}
            <a href="#calculators">what happens to what you type</a>).
          </p>

          <h2 id="providers" className={H2}>
            Which companies handle data for us?
          </h2>
          <p className="answer">
            A small set of service providers that run the site for us: hosting, email, our database, analytics and advertising. Each one processes
            data only to provide its service to us, except Google, which also uses advertising data for its own purposes under its own privacy
            policy.
          </p>
          <div className="not-prose overflow-x-auto">
            <table className="table-sy mt-4 text-[1rem]">
              <thead>
                <tr>
                  <th scope="col">Company</th>
                  <th scope="col">What it does for us</th>
                  <th scope="col">What it handles</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="strong">Vercel</td>
                  <td>Hosts the website</td>
                  <td>Page requests (address, IP address, browser type) in short-term logs</td>
                </tr>
                <tr>
                  <td className="strong">Cloudflare</td>
                  <td>Domain name service, email delivery, database backups</td>
                  <td>Messages emailed to us; daily copies of our database (backups)</td>
                </tr>
                <tr>
                  <td className="strong">Neon</td>
                  <td>Our database</td>
                  <td>Contact messages, feedback, error reports</td>
                </tr>
                <tr>
                  <td className="strong">GitHub</td>
                  <td>Runs our automated jobs, including the nightly database backup</td>
                  <td>A copy of the database passes through it on the way to the backup store; it isn’t kept there</td>
                </tr>
                <tr>
                  <td className="strong">Google (Gmail)</td>
                  <td>Our email inbox</td>
                  <td>Contact messages and our replies</td>
                </tr>
                <tr>
                  <td className="strong">FlowGlance</td>
                  <td>Website analytics</td>
                  <td>Usage, page addresses, page text, submitted form text, browser identifiers</td>
                </tr>
                <tr>
                  <td className="strong">Google (AdSense)</td>
                  <td>Advertising, when ads are running</td>
                  <td>
                    Advertising cookies, ad interactions and the address of the page showing the ad, under{" "}
                    <a className="link" href={EXTERNAL.googlePrivacy} {...ext}>
                      Google’s privacy policy
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>We may also disclose information if the law requires it, for example in response to a valid court order.</p>

          <h2 id="sale" className={H2}>
            Do we sell or “share” your personal information?
          </h2>
          <p className="answer">
            We don’t sell personal information as the California Consumer Privacy Act (CCPA) defines it. But when ads are running and you allow
            personalized ads, Google’s cookies may count as “sharing” for cross-context behavioral advertising — and some states call it “targeted
            advertising”. You can opt out in three ways.
          </p>
          <ol>
            <li>
              Choose <strong>Essential only</strong> in our cookie notice, or reset your choice on the <Link href="/cookies">cookie policy page</Link>.
              We then ask Google for non-personalized ads only.
            </li>
            <li>
              Turn on <a href={EXTERNAL.gpc} {...ext}>Global Privacy Control</a> (GPC) in your browser. We treat a GPC signal as a request to opt out
              of sale and sharing, the same as choosing Essential only, without you having to click anything.
            </li>
            <li>
              Turn off ad personalization in <a href={EXTERNAL.googleAdsSettings} {...ext}>Google’s Ads Settings</a>.
            </li>
          </ol>
          <p>
            In legal terms, the categories we collect are identifiers (your email address, a scrambled IP code, random browser IDs), internet
            activity on this site (pages, clicks and the text shown to you) and the messages you send us. We don’t intentionally collect sensitive personal information, and we don’t use any of it to
            make decisions about you.
          </p>

          <h2 id="retention" className={H2}>
            How long do we keep things?
          </h2>
          <p className="answer">
            Only as long as it is useful: contact messages and feedback for {RETENTION.contactMonths} months, error reports for{" "}
            {RETENTION.errorLogDays} days. After that they are deleted, and they drop out of our rolling backups within {RETENTION.backupDays} days.
            Things stored in your own browser stay until you clear them.
          </p>
          <div className="not-prose overflow-x-auto">
            <table className="table-sy mt-4 text-[1rem]">
              <thead>
                <tr>
                  <th scope="col">What</th>
                  <th scope="col">How long</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="strong">Contact messages</td>
                  <td>{RETENTION.contactMonths} months</td>
                </tr>
                <tr>
                  <td className="strong">Feedback votes and comments</td>
                  <td>{RETENTION.feedbackMonths} months</td>
                </tr>
                <tr>
                  <td className="strong">Error reports</td>
                  <td>{RETENTION.errorLogDays} days</td>
                </tr>
                <tr>
                  <td className="strong">Database backups</td>
                  <td>Rolling, the oldest deleted after {RETENTION.backupDays} days</td>
                </tr>
                <tr>
                  <td className="strong">Analytics and hosting logs</td>
                  <td>Kept by FlowGlance and Vercel under their own retention settings</td>
                </tr>
                <tr>
                  <td className="strong">Your cookie choice and analytics IDs</td>
                  <td>In your own browser until you clear them (see the cookie policy)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 id="rights" className={H2}>
            What are your rights?
          </h2>
          <p className="answer">
            Wherever you live, you can ask us what personal information we have about you, ask us to correct or delete it, get a copy, and opt out
            of sale, sharing and targeted advertising. Several states, including California, give these rights by law; we honor them for everyone.
          </p>
          <ul>
            <li>
              <strong>How to ask:</strong> email {mail} or use the <Link href="/contact?topic=other">contact form</Link>. Tell us the email address
              you used with us.
            </li>
            <li>
              <strong>Verification:</strong> we confirm requests by replying to that email address. We never ask for your Social Security number.
            </li>
            <li>
              <strong>Timing:</strong> {REPLY_PROMISE.toLowerCase()} to acknowledge your request, and we complete it within{" "}
              {PRIVACY_REQUEST_DAYS} days, as the law requires.
            </li>
            <li>
              <strong>Analytics data:</strong> FlowGlance data is tied to a random ID in your browser, not to your name. Our{" "}
              <Link href="/cookies">cookie policy page</Link> shows the ID for this browser — send it to us and we will have what is linked to it
              deleted. If you used the contact form, tell us that too, so we can find that submission. Clearing this site’s data starts a new ID.
            </li>
            <li>
              <strong>Someone acting for you:</strong> an authorized agent can make a request with your written permission.
            </li>
            <li>
              <strong>Appeal and fairness:</strong> if we decline a request, you can ask us to reconsider by replying to our answer. Using your rights
              never changes how the site works for you.
            </li>
          </ul>

          <h2 id="children" className={H2}>
            Is the site meant for children?
          </h2>
          <p className="answer">
            No. {SITE.name} is written for adults planning retirement and is not directed to children under {CHILD_AGE}. We don’t knowingly collect
            personal information from them. If you believe a child has sent us information, write to us and we will delete it.
          </p>

          <h2 id="security" className={H2}>
            How do we protect information?
          </h2>
          <p className="answer">
            The whole site runs over an encrypted connection (HTTPS), only the site’s operators can open the database and the inbox, we store IP
            addresses only in scrambled form, and our database and backup providers encrypt what they store. No system is perfectly secure, so we
            collect as little as we can.
          </p>

          <h2 id="changes" className={H2}>
            What if this policy changes, and how do you reach us?
          </h2>
          <p className="answer">
            We will update this page and the effective date at the top. If a change affects how we use information you already gave us, we will say
            so at the top of this page before it takes effect. Questions are welcome any time — by email or through the contact form.
          </p>
          <p>
            Questions about privacy go to {mail}, or use the <Link href="/contact?topic=other">contact form</Link>. {REPLY_PROMISE}. This policy is
            effective <time dateTime={POLICY_EFFECTIVE}>{longDate(POLICY_EFFECTIVE)}</time>.
          </p>
        </ProseCard>
      </ContentSection>
    </>
  );
}
