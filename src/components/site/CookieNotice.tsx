"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

const KEY = "sy_consent_v1";
const noopSubscribe = () => () => {};

/**
 * Plain-language notice. "Essential only" keeps the calculators working and asks ad partners for
 * non-personalized ads; it never blocks the page.
 */
export function CookieNotice() {
  // null on the server and during hydration → render nothing; then the stored choice (or "none").
  const stored = useSyncExternalStore(
    noopSubscribe,
    () => {
      try {
        return localStorage.getItem(KEY) ?? "none";
      } catch {
        return "blocked"; // storage blocked: don't nag
      }
    },
    () => null,
  );
  const [dismissed, setDismissed] = useState(false);
  const show = stored === "none" && !dismissed;
  const setShow = (v: boolean) => setDismissed(!v);
  if (!show) return null;
  const choose = (v: "all" | "essential") => {
    setShow(false);
    try {
      localStorage.setItem(KEY, JSON.stringify({ v, at: Date.now() }));
    } catch {
      /* ignore */
    }
    (window as unknown as { fw?: (...a: unknown[]) => void }).fw?.("event", "cookie_choice", { choice: v });
    window.dispatchEvent(new CustomEvent("sy-consent", { detail: v }));
  };
  return (
    <div data-cookie-notice className="fixed inset-x-3 bottom-3 z-[60] sm:inset-x-auto sm:bottom-5 sm:right-5 sm:max-w-md" role="dialog" aria-live="polite" aria-label="Cookie notice">
      <div className="float rise p-4 sm:p-5">
        <p className="text-[0.95rem] leading-snug text-ink-2 sm:text-[1rem] sm:leading-relaxed">
          We use cookies and similar browser storage for analytics, and ads that keep this site free. We don’t save what you type into calculators.{" "}
          <Link href="/cookies" className="link">Details</Link>
        </p>
        <div className="mt-3 flex gap-2 sm:mt-4">
          <button type="button" className="btn btn-primary min-h-11 flex-1 !text-[1rem] sm:min-h-[3.25rem]" onClick={() => choose("all")}>
            Accept all
          </button>
          <button type="button" className="btn btn-ghost min-h-11 flex-1 !text-[1rem] sm:min-h-[3.25rem]" onClick={() => choose("essential")}>
            Essential only
          </button>
        </div>
      </div>
    </div>
  );
}
