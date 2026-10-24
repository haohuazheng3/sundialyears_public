import type { Metadata } from "next";
import { SeoToolPage, seoMetadata } from "@/components/seo/SeoToolPage";
import { SpousalCalculator } from "@/components/calculators/seo/SpousalCalculator";

const SLUG = "social-security-spousal-benefits-calculator";

export const metadata: Metadata = seoMetadata(SLUG);

export default function Page() {
  return (
    <SeoToolPage slug={SLUG}>
      <SpousalCalculator />
    </SeoToolPage>
  );
}
