import type { Metadata } from "next";
import { SeoToolPage, seoMetadata } from "@/components/seo/SeoToolPage";
import { CapGainsCalculator } from "@/components/calculators/seo/CapGainsCalculator";

const SLUG = "capital-gains-tax-over-65-calculator";

export const metadata: Metadata = seoMetadata(SLUG);

export default function Page() {
  return (
    <SeoToolPage slug={SLUG}>
      <CapGainsCalculator />
    </SeoToolPage>
  );
}
