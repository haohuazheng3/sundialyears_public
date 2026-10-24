import type { Metadata } from "next";
import { SeoToolPage, seoMetadata } from "@/components/seo/SeoToolPage";
import { QlacCalculator } from "@/components/calculators/seo/QlacCalculator";

const SLUG = "qlac-calculator";

export const metadata: Metadata = seoMetadata(SLUG);

export default function Page() {
  return (
    <SeoToolPage slug={SLUG}>
      <QlacCalculator />
    </SeoToolPage>
  );
}
