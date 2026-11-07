import type { Metadata } from "next";
import { SeoToolPage, seoMetadata } from "@/components/seo/SeoToolPage";
import { WepCalculator } from "@/components/calculators/seo/WepCalculator";

const SLUG = "windfall-elimination-provision-calculator";

export const metadata: Metadata = seoMetadata(SLUG);

export default function Page() {
  return (
    <SeoToolPage slug={SLUG}>
      <WepCalculator />
    </SeoToolPage>
  );
}
