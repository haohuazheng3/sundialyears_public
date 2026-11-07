import type { Metadata } from "next";
import { SeoToolPage, seoMetadata } from "@/components/seo/SeoToolPage";
import { PartBPenaltyCalculator } from "@/components/calculators/seo/PartBPenaltyCalculator";

const SLUG = "medicare-part-b-late-enrollment-penalty";

export const metadata: Metadata = seoMetadata(SLUG);

export default function Page() {
  return (
    <SeoToolPage slug={SLUG}>
      <PartBPenaltyCalculator />
    </SeoToolPage>
  );
}
