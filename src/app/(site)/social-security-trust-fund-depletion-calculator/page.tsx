import type { Metadata } from "next";
import { SeoToolPage, seoMetadata } from "@/components/seo/SeoToolPage";
import { TrustFundCalculator } from "@/components/calculators/seo/TrustFundCalculator";

const SLUG = "social-security-trust-fund-depletion-calculator";

export const metadata: Metadata = seoMetadata(SLUG);

export default function Page() {
  return (
    <SeoToolPage slug={SLUG}>
      <TrustFundCalculator />
    </SeoToolPage>
  );
}
