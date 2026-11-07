import type { Metadata } from "next";
import { SeoToolPage, seoMetadata } from "@/components/seo/SeoToolPage";
import { Ssa44Calculator } from "@/components/calculators/seo/Ssa44Calculator";

const SLUG = "ssa-44-irmaa-appeal";

export const metadata: Metadata = seoMetadata(SLUG);

export default function Page() {
  return (
    <SeoToolPage slug={SLUG}>
      <Ssa44Calculator />
    </SeoToolPage>
  );
}
