import Link from "next/link";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Icon } from "@/components/ui/Icon";
import { CALCULATORS } from "@/lib/tools";

export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main" className="mx-auto max-w-[900px] px-4 py-16 sm:px-6 sm:py-24">
        <div className="float p-8 text-center sm:p-12">
          <p className="eyebrow">404 · Page not found</p>
          <h1 className="mt-4 text-[2.4rem] font-semibold leading-tight sm:text-[3rem]">That page has moved on.</h1>
          <p className="mx-auto mt-4 max-w-lg text-[1.125rem] text-ink-2">
            The link may be old or mistyped. Here are the calculators people use most — or head back to the start.
          </p>
          <Link href="/" className="btn btn-primary mt-8">
            <Icon name="arrow" size={18} className="rotate-180" /> Back to Sundial Years
          </Link>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {CALCULATORS.slice(0, 6).map((t) => (
            <Link key={t.slug} href={`/${t.slug}`} className="float-soft float-lift flex items-center gap-3 p-4 font-bold text-ink">
              <span className="text-sun-ink">
                <Icon name={t.icon} size={20} />
              </span>
              {t.title}
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
