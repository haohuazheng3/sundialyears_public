import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { CookieNotice } from "@/components/site/CookieNotice";

/** Every public page is fully prerendered: no request-time server work, so crawlers and visitors hit the CDN. */
export const ensureStatic = "navigation";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Header />
      <main id="main" className="relative">
        {children}
      </main>
      <Footer />
      <CookieNotice />
    </>
  );
}
