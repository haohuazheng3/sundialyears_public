import type { Metadata } from "next";
import { SeoToolPage, seoMetadata } from "@/components/seo/SeoToolPage";
import { MoneyLastCalculator } from "@/components/calculators/seo/MoneyLastCalculator";

const SLUG = "how-long-will-my-money-last-calculator";

export const metadata: Metadata = seoMetadata(SLUG);

export default function Page() {
  return (
    <SeoToolPage slug={SLUG}>
      <MoneyLastCalculator />
    </SeoToolPage>
  );
}
