import type { Metadata } from "next";
import { SeoToolPage, seoMetadata } from "@/components/seo/SeoToolPage";
import { CreditsCalculator } from "@/components/calculators/seo/CreditsCalculator";

const SLUG = "social-security-work-credits-calculator";

export const metadata: Metadata = seoMetadata(SLUG);

export default function Page() {
  return (
    <SeoToolPage slug={SLUG}>
      <CreditsCalculator />
    </SeoToolPage>
  );
}
