import type { Metadata } from "next";
import { SeoToolPage, seoMetadata } from "@/components/seo/SeoToolPage";
import { M3pCalculator } from "@/components/calculators/seo/M3pCalculator";

const SLUG = "medicare-prescription-payment-plan-calculator";

export const metadata: Metadata = seoMetadata(SLUG);

export default function Page() {
  return (
    <SeoToolPage slug={SLUG}>
      <M3pCalculator />
    </SeoToolPage>
  );
}
