import type { Metadata } from "next";
import { SeoToolPage, seoMetadata } from "@/components/seo/SeoToolPage";
import { Rule55Calculator } from "@/components/calculators/seo/Rule55Calculator";

const SLUG = "rule-of-55-calculator";

export const metadata: Metadata = seoMetadata(SLUG);

export default function Page() {
  return (
    <SeoToolPage slug={SLUG}>
      <Rule55Calculator />
    </SeoToolPage>
  );
}
