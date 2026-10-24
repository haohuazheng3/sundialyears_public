import type { Metadata } from "next";
import { SeoToolPage, seoMetadata } from "@/components/seo/SeoToolPage";
import { FilingCalculator } from "@/components/calculators/seo/FilingCalculator";

const SLUG = "do-seniors-have-to-file-taxes";

export const metadata: Metadata = seoMetadata(SLUG);

export default function Page() {
  return (
    <SeoToolPage slug={SLUG}>
      <FilingCalculator />
    </SeoToolPage>
  );
}
