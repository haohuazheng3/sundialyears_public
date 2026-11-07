import type { Metadata } from "next";
import { SeoToolPage, seoMetadata } from "@/components/seo/SeoToolPage";
import { SurvivorCalculator } from "@/components/calculators/seo/SurvivorCalculator";

const SLUG = "social-security-survivor-benefits-calculator";

export const metadata: Metadata = seoMetadata(SLUG);

export default function Page() {
  return (
    <SeoToolPage slug={SLUG}>
      <SurvivorCalculator />
    </SeoToolPage>
  );
}
