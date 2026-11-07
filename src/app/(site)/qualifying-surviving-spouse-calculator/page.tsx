import type { Metadata } from "next";
import { SeoToolPage, seoMetadata } from "@/components/seo/SeoToolPage";
import { QssCalculator } from "@/components/calculators/seo/QssCalculator";

const SLUG = "qualifying-surviving-spouse-calculator";

export const metadata: Metadata = seoMetadata(SLUG);

export default function Page() {
  return (
    <SeoToolPage slug={SLUG}>
      <QssCalculator />
    </SeoToolPage>
  );
}
