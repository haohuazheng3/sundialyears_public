import Link from "next/link";
import { LogoMark, Wordmark } from "./Logo";
import { CALCULATORS, REFERENCES } from "@/lib/tools";

const CORE_CALCULATORS = CALCULATORS.filter((t) => t.tier !== "more");
import { SITE } from "@/lib/site";

export function Footer() {
  return (
    <footer data-site-footer className="px-3 pb-6 pt-24 sm:px-5">
      <div className="float mx-auto max-w-[1180px] p-6 sm:p-10">
        <div className="grid gap-10 md:grid-cols-[1.3fr_1fr_1fr_0.8fr]">
          <div className="max-w-sm">
            <Link href="/" className="inline-flex items-center gap-2.5 text-ink" aria-label="Sundial Years — home">
              <LogoMark size={34} />
              <Wordmark />
            </Link>
            <p className="mt-4 text-[1rem] leading-relaxed text-ink-2">
              Free retirement calculators built on the official SSA, CMS and IRS numbers — with every source linked and
              every figure re-checked when the agencies publish new ones.
            </p>
            <p className="mt-4 text-[0.95rem] text-ink-3">
              Numbers verified against primary sources on{" "}
              <time dateTime={SITE.dataVerifiedOn} className="font-semibold text-ink-2">
                {new Date(`${SITE.dataVerifiedOn}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })}
              </time>
              . <Link href="/methodology" className="link">How we check</Link>
            </p>
          </div>

          <nav aria-label="Calculators">
            <p className="eyebrow mb-3">Calculators</p>
            <ul className="space-y-2 text-[1rem]">
              {CORE_CALCULATORS.map((t) => (
                <li key={t.slug}>
                  <Link href={`/${t.slug}`} className="text-ink-2 hover:text-ink">
                    {t.navTitle}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/calculators" className="font-bold text-sun-ink hover:text-ink">
                  All {CALCULATORS.length} calculators →
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Reference">
            <p className="eyebrow mb-3">Reference</p>
            <ul className="space-y-2 text-[1rem]">
              {REFERENCES.map((t) => (
                <li key={t.slug}>
                  <Link href={`/${t.slug}`} className="text-ink-2 hover:text-ink">
                    {t.navTitle}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Company">
            <p className="eyebrow mb-3">Sundial Years</p>
            <ul className="space-y-2 text-[1rem]">
              <li><Link href="/about" className="text-ink-2 hover:text-ink">About</Link></li>
              <li><Link href="/methodology" className="text-ink-2 hover:text-ink">Methodology &amp; sources</Link></li>
              <li><Link href="/faq" className="text-ink-2 hover:text-ink">FAQ</Link></li>
              <li><Link href="/blog" className="text-ink-2 hover:text-ink">Guides</Link></li>
              <li><Link href="/contact" className="text-ink-2 hover:text-ink">Contact</Link></li>
              <li><Link href="/privacy" className="text-ink-2 hover:text-ink">Privacy policy</Link></li>
              <li><Link href="/terms" className="text-ink-2 hover:text-ink">Terms of use</Link></li>
              <li><Link href="/cookies" className="text-ink-2 hover:text-ink">Cookie policy</Link></li>
            </ul>
          </nav>
        </div>

        <div className="divider-dots my-8" />

        <div className="flex flex-col gap-3 text-[0.9375rem] leading-relaxed text-ink-3 md:flex-row md:items-start md:justify-between">
          <p className="max-w-3xl">
            Sundial Years provides general educational estimates, not financial, tax, legal or Medicare enrollment advice.
            We are not affiliated with the Social Security Administration, CMS, Medicare or the IRS. Confirm decisions with
            the agency or a qualified professional.
          </p>
          <p className="shrink-0">
            © {SITE.copyrightYear} {SITE.name} ·{" "}
            <a href={`mailto:${SITE.contactEmail}`} className="hover:text-ink">
              {SITE.contactEmail}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
