"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";

/**
 * Standard calculator layout.
 * Desktop: inputs (left, sticky) + results (right). Mobile: inputs, then results, plus a floating
 * "your answer" pill that appears while the result panel is off-screen — one tap jumps to it.
 */
export function CalculatorShell({
  id = "calculator",
  inputs,
  result,
  mobileSummary,
  inputsTitle = "Your details",
}: {
  id?: string;
  inputs: React.ReactNode;
  result: React.ReactNode;
  /** Short text for the floating pill, e.g. "2027 RMD: $18,868". */
  mobileSummary?: React.ReactNode;
  inputsTitle?: string;
}) {
  const resultRef = useRef<HTMLDivElement>(null);
  const [resultVisible, setResultVisible] = useState(true);

  useEffect(() => {
    const el = resultRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setResultVisible(e.isIntersecting), { rootMargin: "0px 0px -20% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section id={id} aria-label="Calculator" className="mx-auto max-w-[1180px] px-4 sm:px-6">
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:gap-6">
        <div className="float p-5 sm:p-7 lg:sticky lg:top-24">
          <h2 className="mb-5 flex items-center gap-2 text-[1.35rem] font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-sun-wash text-sun-ink">
              <Icon name="spark" size={16} />
            </span>
            {inputsTitle}
          </h2>
          <div className="space-y-6">{inputs}</div>
          <p className="mt-6 flex items-center gap-2 text-[0.9375rem] text-ink-3">
            <Icon name="check" size={16} /> Results update as you type. We don’t save what you enter; shared links keep it after the “#”, which never reaches our servers.
          </p>
        </div>
        <div ref={resultRef} id={`${id}-result`} className="float scroll-mt-28 p-5 sm:p-8">
          {result}
        </div>
      </div>

      {mobileSummary ? (
        <button
          type="button"
          onClick={() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          className={`no-print float fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 flex items-center justify-between gap-3 rounded-full px-5 py-3 text-left transition-all duration-200 lg:hidden ${
            resultVisible ? "pointer-events-none translate-y-4 opacity-0" : "translate-y-0 opacity-100"
          }`}
          aria-hidden={resultVisible}
          tabIndex={resultVisible ? -1 : 0}
        >
          <span className="num truncate text-[1.0625rem] font-bold text-ink">{mobileSummary}</span>
          <span className="flex shrink-0 items-center gap-1 text-[0.95rem] font-bold text-sun-ink">
            See result <Icon name="arrow" size={17} className="rotate-90" />
          </span>
        </button>
      ) : null}
    </section>
  );
}

/** Section wrapper for long-form content below the calculator. */
export function ContentSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`mx-auto max-w-[1180px] px-4 sm:px-6 ${className}`}>{children}</section>;
}

/** Floating prose card for explanations. */
export function ProseCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`float prose-sy mx-auto max-w-[860px] p-6 sm:p-10 ${className}`}>{children}</div>;
}
