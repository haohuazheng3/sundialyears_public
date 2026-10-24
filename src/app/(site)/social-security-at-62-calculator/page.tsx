import type { Metadata } from "next";
import { SeoToolPage, seoMetadata } from "@/components/seo/SeoToolPage";
import { At62Calculator } from "@/components/calculators/seo/At62Calculator";

const SLUG = "social-security-at-62-calculator";

export const metadata: Metadata = seoMetadata(SLUG);

export default function Page() {
  return (
    <SeoToolPage slug={SLUG}>
      <At62Calculator />
    </SeoToolPage>
  );
}
