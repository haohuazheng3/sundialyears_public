import type { Metadata } from "next";
import { SeoToolPage, seoMetadata } from "@/components/seo/SeoToolPage";
import { RetirementTaxCalculator } from "@/components/calculators/seo/RetirementTaxCalculator";

const SLUG = "retirement-tax-calculator";

export const metadata: Metadata = seoMetadata(SLUG);

export default function Page() {
  return (
    <SeoToolPage slug={SLUG}>
      <RetirementTaxCalculator />
    </SeoToolPage>
  );
}
