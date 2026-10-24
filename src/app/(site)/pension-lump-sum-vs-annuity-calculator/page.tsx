import type { Metadata } from "next";
import { SeoToolPage, seoMetadata } from "@/components/seo/SeoToolPage";
import { PensionCalculator } from "@/components/calculators/seo/PensionCalculator";

const SLUG = "pension-lump-sum-vs-annuity-calculator";

export const metadata: Metadata = seoMetadata(SLUG);

export default function Page() {
  return (
    <SeoToolPage slug={SLUG}>
      <PensionCalculator />
    </SeoToolPage>
  );
}
