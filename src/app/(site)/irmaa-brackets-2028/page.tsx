import type { Metadata } from "next";
import { SeoToolPage, seoMetadata } from "@/components/seo/SeoToolPage";
import { Irmaa2028Calculator } from "@/components/calculators/seo/Irmaa2028Calculator";

const SLUG = "irmaa-brackets-2028";

export const metadata: Metadata = seoMetadata(SLUG);

export default function Page() {
  return (
    <SeoToolPage slug={SLUG}>
      <Irmaa2028Calculator />
    </SeoToolPage>
  );
}
