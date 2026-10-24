import type { Metadata } from "next";
import { SeoToolPage, seoMetadata } from "@/components/seo/SeoToolPage";
import { WithdrawalTaxCalculator } from "@/components/calculators/seo/WithdrawalTaxCalculator";

const SLUG = "401k-withdrawal-tax-calculator";

export const metadata: Metadata = seoMetadata(SLUG);

export default function Page() {
  return (
    <SeoToolPage slug={SLUG}>
      <WithdrawalTaxCalculator />
    </SeoToolPage>
  );
}
