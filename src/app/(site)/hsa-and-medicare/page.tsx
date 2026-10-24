import type { Metadata } from "next";
import { SeoToolPage, seoMetadata } from "@/components/seo/SeoToolPage";
import { HsaCalculator } from "@/components/calculators/seo/HsaCalculator";

const SLUG = "hsa-and-medicare";

export const metadata: Metadata = seoMetadata(SLUG);

export default function Page() {
  return (
    <SeoToolPage slug={SLUG}>
      <HsaCalculator />
    </SeoToolPage>
  );
}
