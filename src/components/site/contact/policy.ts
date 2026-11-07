/**
 * Policy constants shared by the privacy, cookie, terms, FAQ and contact pages, so a change is made once.
 * These are our own commitments (not agency figures), which is why they live here and not in src/data/params.
 */

/** Effective date of the current privacy policy, cookie policy and terms (ISO). A constant — never the clock. */
export const POLICY_EFFECTIVE = "2026-10-23";

/** How long we keep what visitors send us. */
export const RETENTION = {
  contactMonths: 24,
  feedbackMonths: 24,
  errorLogDays: 90,
  /** Daily database backups kept on a rolling basis (one dump per day). */
  backupDays: 30,
} as const;

/** We don't knowingly collect information from children under this age (COPPA). */
export const CHILD_AGE = 13;

/** We complete privacy requests (access, deletion, correction) within this many days (the CCPA's response window). */
export const PRIVACY_REQUEST_DAYS = 45;

/**
 * How often the source watcher re-checks the official pages. Mirrors the `/api/cron/source-watch` schedule in
 * vercel.json ("17 *\/6 * * *"); contact.test.ts fails if the two drift apart.
 */
export const SOURCE_WATCH_HOURS = 6;

/** Our target for putting newly published official figures on the site. */
export const UPDATE_TARGET = "within one business day";

/** Browser storage keys and cookies the site uses (shown on /cookies; referenced from /privacy). */
export const STORAGE_KEYS = {
  consent: "sy_consent_v1",
  fwVisitor: "_fw_vid",
  fwSession: "_fw_sid",
  fwLastActivity: "_fw_la",
  fwExclude: "fw_exclude",
  admin: "sy_admin",
} as const;

/**
 * Lifetimes of the owner-only cookies, mirrored from the code that sets them:
 * fw_exclude → src/app/api/admin/login/route.ts (maxAge 400 days); sy_admin → src/lib/server/admin.ts (TTL_SECONDS, 14 days).
 * Update both places together.
 */
export const OWNER_COOKIE_DAYS = { fwExclude: 400, admin: 14 } as const;

/** Third-party pages we point people to (stable, official URLs). */
export const EXTERNAL = {
  googlePartnerSites: "https://policies.google.com/technologies/partner-sites",
  googleAdsCookies: "https://policies.google.com/technologies/ads",
  googleCookieTypes: "https://policies.google.com/technologies/cookies",
  googleAdsSettings: "https://adssettings.google.com",
  googlePrivacy: "https://policies.google.com/privacy",
  aboutAdsOptOut: "https://optout.aboutads.info",
  naiOptOut: "https://optout.networkadvertising.org",
  gpc: "https://globalprivacycontrol.org",
  flowglance: "https://flowglance.com",
} as const;
