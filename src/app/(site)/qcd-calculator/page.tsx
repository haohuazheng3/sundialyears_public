import type { Metadata } from "next";
import { SeoToolPage, seoMetadata } from "@/components/seo/SeoToolPage";
import { QcdCalculator } from "@/components/calculators/seo/QcdCalculator";

const SLUG = "qcd-calculator";

export const metadata: Metadata = seoMetadata(SLUG);

export default function Page() {
  return (
    <SeoToolPage slug={SLUG}>
      <QcdCalculator />
    </SeoToolPage>
  );
}
