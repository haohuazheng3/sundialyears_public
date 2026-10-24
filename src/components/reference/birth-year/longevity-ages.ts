import { MEDICARE_ENROLLMENT } from "@/data/params/birth-year-extra";

/**
 * Ages used for the longevity rows on the birth-year pages: survival from 65 (Medicare age) to two planning horizons.
 * The horizons are planning milestones we chose for illustration, not program parameters.
 */
export const LONGEVITY_AGES = { from: MEDICARE_ENROLLMENT.value.eligibilityAge, targets: [85, 90] as const };
