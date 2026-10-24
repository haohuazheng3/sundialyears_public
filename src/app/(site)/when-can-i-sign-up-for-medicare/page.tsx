import type { Metadata } from "next";
import { SeoToolPage, seoMetadata } from "@/components/seo/SeoToolPage";
import { IepCalculator } from "@/components/calculators/seo/IepCalculator";

const SLUG = "when-can-i-sign-up-for-medicare";

export const metadata: Metadata = seoMetadata(SLUG);

export default function Page() {
  return (
    <SeoToolPage slug={SLUG}>
      <IepCalculator />
    </SeoToolPage>
  );
}
