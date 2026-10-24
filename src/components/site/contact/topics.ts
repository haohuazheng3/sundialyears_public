/**
 * Contact-form topics. Values must match the `TOPICS` enum in src/app/api/contact/route.ts.
 * Kept in a plain module (not "use client") so server pages can read the labels too.
 *
 * Inbound link contract for /contact:
 *   ?topic=<value>  preselects the topic (e.g. /contact?topic=number-looks-wrong)
 *   ?page=/path     the page the visitor is asking about (path only; query strings are dropped)
 */
export const CONTACT_TOPICS = [
  { value: "question", label: "A question about a calculator or a rule" },
  { value: "number-looks-wrong", label: "A number looks wrong" },
  { value: "suggestion", label: "A suggestion or a missing calculator" },
  { value: "partnership", label: "Partnership, press or advertising" },
  { value: "other", label: "Something else" },
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number]["value"];

export const isContactTopic = (v: unknown): v is ContactTopic => CONTACT_TOPICS.some((t) => t.value === v);

/** Limits mirror the API's zod schema so the form never sends something the server will reject. */
export const CONTACT_LIMITS = { nameMax: 120, emailMax: 200, messageMin: 5, messageMax: 5000, pageMax: 300 } as const;

/** Same pattern zod v4 uses for `z.string().email()` (after trimming). */
export const EMAIL_PATTERN = /^(?:[A-Za-z0-9_'+\-]+\.)*[A-Za-z0-9_'+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;

/** How fast we promise to answer. Shown on the page and in the success message. */
export const REPLY_PROMISE = "We reply within 2 business days";

/** Only same-site paths: "/rmd-calculator" yes; "//evil.com", "https://…" or anything with a query string no. */
export function cleanPagePath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const path = raw.split(/[?#]/)[0];
  if (!path.startsWith("/") || path.startsWith("//") || path.length > CONTACT_LIMITS.pageMax) return null;
  if (!/^\/[A-Za-z0-9\-._~/]*$/.test(path)) return null;
  if (path === "/contact" || path.startsWith("/contact/")) return null;
  return path;
}

/**
 * Which page the visitor is asking about, from what the browser knows when /contact renders.
 * 1. An explicit, same-site `?page=` wins.
 * 2. Otherwise the referrer — but only when /contact itself was the document the browser loaded. After a client-side
 *    (Next.js <Link>) navigation, `document.referrer` still describes how the *first* page of the visit was reached, so it
 *    may name a page the visitor left several clicks ago (or another site). In that case we offer no page rather than a
 *    wrong one.
 */
export function pageFromNavigation(nav: {
  search: string;
  referrer: string;
  origin: string;
  /** Path of the document the browser actually loaded (Navigation Timing entry), or null if unknown. */
  loadedPath: string | null;
  /** Current path (location.pathname). */
  currentPath: string;
}): string | null {
  const explicit = cleanPagePath(new URLSearchParams(nav.search).get("page"));
  if (explicit) return explicit;
  if (!nav.referrer || nav.loadedPath !== nav.currentPath) return null;
  try {
    const r = new URL(nav.referrer);
    return r.origin === nav.origin ? cleanPagePath(r.pathname) : null;
  } catch {
    return null; // malformed referrer
  }
}
