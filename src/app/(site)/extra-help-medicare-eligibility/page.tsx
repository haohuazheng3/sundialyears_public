import type { Metadata } from "next";
import { SeoToolPage, seoMetadata } from "@/components/seo/SeoToolPage";
import { ExtraHelpCalculator } from "@/components/calculators/seo/ExtraHelpCalculator";

const SLUG = "extra-help-medicare-eligibility";

export const metadata: Metadata = seoMetadata(SLUG);

export default function Page() {
  return (
    <SeoToolPage slug={SLUG}>
      <ExtraHelpCalculator />
    </SeoToolPage>
  );
}
