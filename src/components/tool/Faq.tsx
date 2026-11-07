import { JsonLd } from "@/components/site/JsonLd";
import { faqLd } from "@/lib/seo";
import { Icon } from "@/components/ui/Icon";

export interface FaqItem {
  q: string;
  /** Plain-text answer (used verbatim in FAQPage schema). Answer first, in 40–80 words. */
  a: string;
}

export function Faq({ items, title = "Frequently asked questions" }: { items: FaqItem[]; title?: string }) {
  return (
    <section aria-labelledby="faq-h" className="float p-6 sm:p-8">
      <h2 id="faq-h" className="text-[1.75rem] font-semibold">
        {title}
      </h2>
      <div className="mt-4 divide-y divide-[var(--hairline)]">
        {items.map((f) => (
          <details key={f.q} className="explainer group py-1">
            <summary className="flex min-h-[3.5rem] items-center justify-between gap-4 py-3 text-[1.125rem] font-bold text-ink">
              <span>{f.q}</span>
              <Icon name="chev" size={20} className="chev shrink-0 text-ink-3 transition-transform" />
            </summary>
            <p className="pb-4 pr-8 text-[1.0625rem] leading-relaxed text-ink-2">{f.a}</p>
          </details>
        ))}
      </div>
      <JsonLd data={faqLd(items)} />
    </section>
  );
}
