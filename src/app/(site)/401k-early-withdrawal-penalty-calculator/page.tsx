import type { Metadata } from "next";
import { SeoToolPage, seoMetadata } from "@/components/seo/SeoToolPage";
import { EarlyPenaltyCalculator } from "@/components/calculators/seo/EarlyPenaltyCalculator";

const SLUG = "401k-early-withdrawal-penalty-calculator";

export const metadata: Metadata = seoMetadata(SLUG);

export default function Page() {
  return (
    <SeoToolPage slug={SLUG}>
      <EarlyPenaltyCalculator />
    </SeoToolPage>
  );
}
