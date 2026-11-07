import type { Metadata } from "next";
import { SeoToolPage, seoMetadata } from "@/components/seo/SeoToolPage";
import { LifeExpectancyCalculator } from "@/components/calculators/seo/LifeExpectancyCalculator";

const SLUG = "life-expectancy-calculator";

export const metadata: Metadata = seoMetadata(SLUG);

export default function Page() {
  return (
    <SeoToolPage slug={SLUG}>
      <LifeExpectancyCalculator />
    </SeoToolPage>
  );
}
