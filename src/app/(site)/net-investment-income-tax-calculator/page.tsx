import type { Metadata } from "next";
import { SeoToolPage, seoMetadata } from "@/components/seo/SeoToolPage";
import { NiitCalculator } from "@/components/calculators/seo/NiitCalculator";

const SLUG = "net-investment-income-tax-calculator";

export const metadata: Metadata = seoMetadata(SLUG);

export default function Page() {
  return (
    <SeoToolPage slug={SLUG}>
      <NiitCalculator />
    </SeoToolPage>
  );
}
