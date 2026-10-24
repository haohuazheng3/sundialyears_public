import type { Metadata } from "next";
import { SeoToolPage, seoMetadata } from "@/components/seo/SeoToolPage";
import { MedigapOepCalculator } from "@/components/calculators/seo/MedigapOepCalculator";

const SLUG = "medigap-open-enrollment-period";

export const metadata: Metadata = seoMetadata(SLUG);

export default function Page() {
  return (
    <SeoToolPage slug={SLUG}>
      <MedigapOepCalculator />
    </SeoToolPage>
  );
}
