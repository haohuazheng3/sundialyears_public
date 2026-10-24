import type { Metadata } from "next";
import { SeoToolPage, seoMetadata } from "@/components/seo/SeoToolPage";
import { GpoCalculator } from "@/components/calculators/seo/GpoCalculator";

const SLUG = "government-pension-offset-calculator";

export const metadata: Metadata = seoMetadata(SLUG);

export default function Page() {
  return (
    <SeoToolPage slug={SLUG}>
      <GpoCalculator />
    </SeoToolPage>
  );
}
