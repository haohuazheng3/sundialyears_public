import type { Metadata } from "next";
import { SeoToolPage, seoMetadata } from "@/components/seo/SeoToolPage";
import { FormulaCalculator } from "@/components/calculators/seo/FormulaCalculator";

const SLUG = "how-social-security-is-calculated";

export const metadata: Metadata = seoMetadata(SLUG);

export default function Page() {
  return (
    <SeoToolPage slug={SLUG}>
      <FormulaCalculator />
    </SeoToolPage>
  );
}
