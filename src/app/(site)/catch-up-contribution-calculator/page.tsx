import type { Metadata } from "next";
import { SeoToolPage, seoMetadata } from "@/components/seo/SeoToolPage";
import { CatchUpCalculator } from "@/components/calculators/seo/CatchUpCalculator";

const SLUG = "catch-up-contribution-calculator";

export const metadata: Metadata = seoMetadata(SLUG);

export default function Page() {
  return (
    <SeoToolPage slug={SLUG}>
      <CatchUpCalculator />
    </SeoToolPage>
  );
}
