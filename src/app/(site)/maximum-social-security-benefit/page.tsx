import type { Metadata } from "next";
import { SeoToolPage, seoMetadata } from "@/components/seo/SeoToolPage";
import { MaxBenefitCalculator } from "@/components/calculators/seo/MaxBenefitCalculator";

const SLUG = "maximum-social-security-benefit";

export const metadata: Metadata = seoMetadata(SLUG);

export default function Page() {
  return (
    <SeoToolPage slug={SLUG}>
      <MaxBenefitCalculator />
    </SeoToolPage>
  );
}
