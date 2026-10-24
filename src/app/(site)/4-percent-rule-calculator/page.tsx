import type { Metadata } from "next";
import { SeoToolPage, seoMetadata } from "@/components/seo/SeoToolPage";
import { FourPctCalculator } from "@/components/calculators/seo/FourPctCalculator";

const SLUG = "4-percent-rule-calculator";

export const metadata: Metadata = seoMetadata(SLUG);

export default function Page() {
  return (
    <SeoToolPage slug={SLUG}>
      <FourPctCalculator />
    </SeoToolPage>
  );
}
