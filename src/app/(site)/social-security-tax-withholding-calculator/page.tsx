import type { Metadata } from "next";
import { SeoToolPage, seoMetadata } from "@/components/seo/SeoToolPage";
import { W4vCalculator } from "@/components/calculators/seo/W4vCalculator";

const SLUG = "social-security-tax-withholding-calculator";

export const metadata: Metadata = seoMetadata(SLUG);

export default function Page() {
  return (
    <SeoToolPage slug={SLUG}>
      <W4vCalculator />
    </SeoToolPage>
  );
}
