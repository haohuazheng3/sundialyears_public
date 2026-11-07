import type { Metadata } from "next";
import { SeoToolPage, seoMetadata } from "@/components/seo/SeoToolPage";
import { SsiSsCalculator } from "@/components/calculators/seo/SsiSsCalculator";

const SLUG = "ssi-and-social-security";

export const metadata: Metadata = seoMetadata(SLUG);

export default function Page() {
  return (
    <SeoToolPage slug={SLUG}>
      <SsiSsCalculator />
    </SeoToolPage>
  );
}
