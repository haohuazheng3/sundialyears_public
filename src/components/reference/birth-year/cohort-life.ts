import "server-only";
/**
 * Cohort life expectancy by birth year from SSA's 2026 Trustees Report cohort life tables (intermediate assumptions).
 * Read at build time only (the pages are static); the 58 KB q(x) file never ships to the browser.
 */
import cohortQx from "../../../../public/data/cohort-qx-tr2026.json";
import { lifeExpectancyFromQ, survivalFromQ } from "./timeline";
import { SS_AGES } from "@/data/params/birth-year-extra";
import { LONGEVITY_AGES } from "./longevity-ages";

const AGE_62 = SS_AGES.value.earliestRetirement;
const AGE_65 = LONGEVITY_AGES.from;
const [TARGET_A, TARGET_B] = LONGEVITY_AGES.targets;

const FIRST_AGE = cohortQx.ages[0];
const MALE = cohortQx.male as Record<string, number[]>;
const FEMALE = cohortQx.female as Record<string, number[]>;

export interface CohortLife {
  e62: number;
  e65: number;
  /** Remaining years at the age reached in `refYear` (null if below the table's first age). */
  eNow: number | null;
  ageNow: number;
  /** Probability that someone alive at 65 reaches LONGEVITY_AGES.targets (85 / 90). */
  p85from65: number;
  p90from65: number;
}

function one(q: number[] | undefined, year: number, refYear: number): CohortLife {
  if (!q) throw new Error(`cohort life table has no row for ${year}`);
  const ageNow = refYear - year;
  return {
    e62: lifeExpectancyFromQ(q, FIRST_AGE, AGE_62),
    e65: lifeExpectancyFromQ(q, FIRST_AGE, AGE_65),
    eNow: ageNow >= FIRST_AGE ? lifeExpectancyFromQ(q, FIRST_AGE, ageNow) : null,
    ageNow,
    p85from65: survivalFromQ(q, FIRST_AGE, AGE_65, TARGET_A),
    p90from65: survivalFromQ(q, FIRST_AGE, AGE_65, TARGET_B),
  };
}

export function cohortLife(year: number, refYear: number) {
  return { male: one(MALE[String(year)], year, refYear), female: one(FEMALE[String(year)], year, refYear), source: cohortQx.source };
}
