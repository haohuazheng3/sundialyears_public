import type { Metadata } from "next";
import { SeoToolPage, seoMetadata } from "@/components/seo/SeoToolPage";
import { SeniorDeductionCalculator } from "@/components/calculators/seo/SeniorDeductionCalculator";

const SLUG = "senior-deduction-calculator";

export const metadata: Metadata = seoMetadata(SLUG);

export default function Page() {
  return (
    <SeoToolPage slug={SLUG}>
      <SeniorDeductionCalculator />
    </SeoToolPage>
  );
}
