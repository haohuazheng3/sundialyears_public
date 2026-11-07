/** Site-wide constants. Build-time only — never read the clock in server components (it would make pages dynamic). */
export const SITE = {
  name: "Sundial Years",
  shortName: "Sundial Years",
  domain: "sundialyears.com",
  url: "https://sundialyears.com",
  tagline: "Retirement math, made plain.",
  description:
    "Free, source-cited retirement calculators for Americans: RMDs, IRMAA, when to claim Social Security, the earnings test, taxes on benefits, and Medicare premiums — updated the day SSA, CMS and IRS publish new numbers.",
  contactEmail: "contact@sundialyears.com",
  locale: "en_US",
  /** The year printed in the footer © and the "current" planning year. Bumped by the yearly data update. */
  copyrightYear: 2026,
  /** Date the parameter set was last verified against primary sources (ISO). Updated by the data update process. */
  dataVerifiedOn: "2026-10-23",
  foundingYear: 2026,
} as const;

/** Public IndexNow key (also served at /<key>.txt). Not a secret by design. */
export const INDEXNOW_KEY = "d3b4fa6d2c33564c43af00682f4719bf";

export const FLOWGLANCE_SNIPPET_SRC = "https://flowglance.com/fw.js";
export const FLOWGLANCE_SITE_KEY = "fw_pub_VRqTu9ufsVlxiBQlvVRbOLEu";

export function absoluteUrl(path = "/") {
  return new URL(path, SITE.url).toString();
}
