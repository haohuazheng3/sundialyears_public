import type { Metadata } from "next";
import Link from "next/link";
import { LogoMark, Wordmark } from "@/components/site/Logo";
import { Icon } from "@/components/ui/Icon";

/** Owner-only area: never indexed (also X-Robots-Tag in next.config.ts and disallowed in robots.ts), minimal chrome. */
export const metadata: Metadata = {
  title: { default: "Admin | Sundial Years", template: "%s · Admin | Sundial Years" },
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <>
      <header className="px-3 pt-3 sm:px-5 sm:pt-4">
        <div className="float mx-auto flex h-[4.25rem] max-w-[1280px] items-center gap-3 rounded-full pl-3 pr-2 sm:pl-5">
          <Link href="/admin" className="flex items-center gap-2.5 rounded-full py-2 pr-2 text-ink" aria-label="Sundial Years admin — dashboard">
            <LogoMark size={30} />
            <span className="hidden sm:inline">
              <Wordmark />
            </span>
          </Link>
          <span className="pill pill-sun">Admin</span>
          <Link href="/" className="btn btn-quiet ml-auto">
            View site <Icon name="arrow" size={17} />
          </Link>
        </div>
      </header>
      <main id="main" className="relative mx-auto max-w-[1280px] px-3 pb-16 pt-8 sm:px-5">
        {children}
      </main>
    </>
  );
}
