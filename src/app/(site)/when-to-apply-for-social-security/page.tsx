import type { Metadata } from "next";
import { SeoToolPage, seoMetadata } from "@/components/seo/SeoToolPage";
import { ApplyDateCalculator } from "@/components/calculators/seo/ApplyDateCalculator";

const SLUG = "when-to-apply-for-social-security";

export const metadata: Metadata = seoMetadata(SLUG);

export default function Page() {
  return (
    <SeoToolPage slug={SLUG}>
      <ApplyDateCalculator />
    </SeoToolPage>
  );
}
