import type { Metadata } from "next";
import { SeoToolPage, seoMetadata } from "@/components/seo/SeoToolPage";
import { RmdTaxCalculator } from "@/components/calculators/seo/RmdTaxCalculator";

const SLUG = "rmd-tax-calculator";

export const metadata: Metadata = seoMetadata(SLUG);

export default function Page() {
  return (
    <SeoToolPage slug={SLUG}>
      <RmdTaxCalculator />
    </SeoToolPage>
  );
}
