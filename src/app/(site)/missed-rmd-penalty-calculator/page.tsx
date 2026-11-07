import type { Metadata } from "next";
import { SeoToolPage, seoMetadata } from "@/components/seo/SeoToolPage";
import { RmdPenaltyCalculator } from "@/components/calculators/seo/RmdPenaltyCalculator";

const SLUG = "missed-rmd-penalty-calculator";

export const metadata: Metadata = seoMetadata(SLUG);

export default function Page() {
  return (
    <SeoToolPage slug={SLUG}>
      <RmdPenaltyCalculator />
    </SeoToolPage>
  );
}
