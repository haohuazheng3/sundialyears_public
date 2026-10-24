import type { Metadata } from "next";
import { SeoToolPage, seoMetadata } from "@/components/seo/SeoToolPage";
import { RmdAgeCalculator } from "@/components/calculators/seo/RmdAgeCalculator";

const SLUG = "rmd-age-calculator";

export const metadata: Metadata = seoMetadata(SLUG);

export default function Page() {
  return (
    <SeoToolPage slug={SLUG}>
      <RmdAgeCalculator />
    </SeoToolPage>
  );
}
