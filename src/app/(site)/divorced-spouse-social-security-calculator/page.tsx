import type { Metadata } from "next";
import { SeoToolPage, seoMetadata } from "@/components/seo/SeoToolPage";
import { DivorcedCalculator } from "@/components/calculators/seo/DivorcedCalculator";

const SLUG = "divorced-spouse-social-security-calculator";

export const metadata: Metadata = seoMetadata(SLUG);

export default function Page() {
  return (
    <SeoToolPage slug={SLUG}>
      <DivorcedCalculator />
    </SeoToolPage>
  );
}
