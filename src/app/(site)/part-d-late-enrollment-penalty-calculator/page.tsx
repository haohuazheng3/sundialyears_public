import type { Metadata } from "next";
import { SeoToolPage, seoMetadata } from "@/components/seo/SeoToolPage";
import { PartDPenaltyCalculator } from "@/components/calculators/seo/PartDPenaltyCalculator";

const SLUG = "part-d-late-enrollment-penalty-calculator";

export const metadata: Metadata = seoMetadata(SLUG);

export default function Page() {
  return (
    <SeoToolPage slug={SLUG}>
      <PartDPenaltyCalculator />
    </SeoToolPage>
  );
}
