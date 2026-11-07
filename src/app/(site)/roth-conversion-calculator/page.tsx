import type { Metadata } from "next";
import { SeoToolPage, seoMetadata } from "@/components/seo/SeoToolPage";
import { RothConversionCalculator } from "@/components/calculators/seo/RothConversionCalculator";

const SLUG = "roth-conversion-calculator";

export const metadata: Metadata = seoMetadata(SLUG);

export default function Page() {
  return (
    <SeoToolPage slug={SLUG}>
      <RothConversionCalculator />
    </SeoToolPage>
  );
}
