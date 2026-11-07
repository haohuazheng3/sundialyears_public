import type { Metadata } from "next";
import { SeoToolPage, seoMetadata } from "@/components/seo/SeoToolPage";
import { PartAPremiumCalculator } from "@/components/calculators/seo/PartAPremiumCalculator";

const SLUG = "medicare-part-a-premium";

export const metadata: Metadata = seoMetadata(SLUG);

export default function Page() {
  return (
    <SeoToolPage slug={SLUG}>
      <PartAPremiumCalculator />
    </SeoToolPage>
  );
}
