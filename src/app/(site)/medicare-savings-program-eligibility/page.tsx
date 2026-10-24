import type { Metadata } from "next";
import { SeoToolPage, seoMetadata } from "@/components/seo/SeoToolPage";
import { MspCalculator } from "@/components/calculators/seo/MspCalculator";

const SLUG = "medicare-savings-program-eligibility";

export const metadata: Metadata = seoMetadata(SLUG);

export default function Page() {
  return (
    <SeoToolPage slug={SLUG}>
      <MspCalculator />
    </SeoToolPage>
  );
}
