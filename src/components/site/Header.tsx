"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LogoMark, Wordmark } from "./Logo";
import { Icon } from "@/components/ui/Icon";
import { CORE_TOOLS, TOOLS, type ToolEntry } from "@/lib/tools";

const GROUPS: ToolEntry["group"][] = ["Social Security", "Medicare", "RMDs & IRAs", "Taxes", "Key numbers"];

function grouped() {
  return GROUPS.map((g) => ({ group: g, items: CORE_TOOLS.filter((t) => t.group === g) }));
}

export function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false); // desktop mega menu
  const [sheetOpen, setSheetOpen] = useState(false); // mobile sheet
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close everything on navigation (adjusting state during render, per React docs), Escape, or outside click.
  const [prevPath, setPrevPath] = useState(pathname);
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    setMenuOpen(false);
    setSheetOpen(false);
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setSheetOpen(false);
      }
    };
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, []);
  useEffect(() => {
    document.documentElement.style.overflow = sheetOpen ? "hidden" : "";
  }, [sheetOpen]);

  const groups = grouped();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname?.startsWith(href));

  return (
    <header data-site-header className="sticky top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
      <div ref={wrapRef} className="relative mx-auto max-w-[1180px]">
        <nav
          aria-label="Main"
          className="float flex h-[4.25rem] items-center gap-2 rounded-full pl-3 pr-2 sm:pl-5"
          style={{ backdropFilter: "saturate(1.4) blur(14px)", background: "color-mix(in oklab, var(--card) 88%, transparent)" }}
        >
          <Link href="/" className="flex items-center gap-2.5 rounded-full py-2 pr-3 text-ink" aria-label="Sundial Years — home">
            <LogoMark size={34} />
            <Wordmark />
          </Link>

          <div className="ml-auto hidden items-center gap-1 lg:flex">
            <button
              type="button"
              className="btn btn-quiet"
              aria-expanded={menuOpen}
              aria-controls="mega-menu"
              data-active={menuOpen ? "true" : undefined}
              onClick={() => setMenuOpen((v) => !v)}
            >
              Calculators
              <Icon name="chev" size={18} className={`transition-transform ${menuOpen ? "rotate-180" : ""}`} />
            </button>
            <Link href="/retirement-numbers-2027" className={`btn btn-quiet ${isActive("/retirement-numbers-2027") ? "text-ink" : ""}`}>
              2027 numbers
            </Link>
            <Link href="/state-retirement-taxes" className="btn btn-quiet">
              State taxes
            </Link>
            <Link href="/blog" className="btn btn-quiet">
              Guides
            </Link>
            <Link href="/social-security-cola" className="pill pill-sun ml-2 mr-1 hover:opacity-90" title="2027 Social Security cost-of-living adjustment">
              <Icon name="spark" size={16} />
              2027 COLA +3.6%
            </Link>
          </div>

          <button
            type="button"
            className="btn btn-ghost ml-auto h-12 min-h-12 w-12 !px-0 lg:hidden"
            aria-label={sheetOpen ? "Close menu" : "Open menu"}
            aria-expanded={sheetOpen}
            aria-controls="mobile-sheet"
            onClick={() => setSheetOpen((v) => !v)}
          >
            <Icon name={sheetOpen ? "close" : "menu"} size={22} />
          </button>
        </nav>

        {/* Desktop mega menu — a second floating module */}
        <div
          id="mega-menu"
          hidden={!menuOpen}
          className="float rise absolute left-0 right-0 top-[calc(100%+0.75rem)] hidden p-6 lg:block"
          style={{ display: menuOpen ? undefined : "none" }}
        >
          <div className="grid grid-cols-5 gap-6">
            {groups.map(({ group, items }) => (
              <div key={group}>
                <p className="eyebrow mb-3">{group}</p>
                <ul className="space-y-1">
                  {items.map((t) => (
                    <li key={t.slug}>
                      <Link
                        href={`/${t.slug}`}
                        prefetch
                        className="group flex items-start gap-2.5 rounded-2xl p-2.5 text-[0.98rem] font-semibold leading-snug text-ink-2 transition-colors hover:bg-sunk hover:text-ink"
                      >
                        <span className="mt-0.5 text-sun-ink">
                          <Icon name={t.icon} size={19} />
                        </span>
                        {t.navTitle}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <Link href="/calculators" prefetch className="mt-4 inline-flex items-center gap-1.5 font-bold text-sun-ink">
            All {TOOLS.length} calculators and references <Icon name="arrow" size={18} />
          </Link>
        </div>
      </div>

      {/* Mobile sheet */}
      <div
        id="mobile-sheet"
        className="fixed inset-x-0 bottom-0 top-[5.5rem] z-40 overflow-y-auto px-3 pb-[max(1rem,env(safe-area-inset-bottom))] lg:hidden"
        style={{ display: sheetOpen ? "block" : "none" }}
      >
        <div className="float rise space-y-6 p-5">
          <Link href="/social-security-cola" className="pill pill-sun">
            <Icon name="spark" size={16} /> 2027 COLA is +3.6% — see what it means
          </Link>
          {groups.map(({ group, items }) => (
            <div key={group}>
              <p className="eyebrow mb-2">{group}</p>
              <ul className="grid gap-1">
                {items.map((t) => (
                  <li key={t.slug}>
                    <Link
                      href={`/${t.slug}`}
                      className="flex min-h-[3.25rem] items-center gap-3 rounded-2xl px-3 text-[1.0625rem] font-semibold text-ink active:bg-sunk"
                    >
                      <span className="text-sun-ink">
                        <Icon name={t.icon} size={20} />
                      </span>
                      {t.navTitle}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <Link href="/calculators" className="btn btn-primary w-full">
            All {TOOLS.length} calculators
          </Link>
          <div className="grid grid-cols-2 gap-2 border-t border-hairline pt-4">
            <Link href="/blog" className="btn btn-ghost">Guides</Link>
            <Link href="/about" className="btn btn-ghost">About</Link>
          </div>
        </div>
      </div>
    </header>
  );
}
