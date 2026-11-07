// Withdrawal-rate research cited by the 4% rule and money-duration tools.
import { cite } from "./types";
import { SRC } from "./sources";
import { PERIOD_LIFE_TABLE } from "../generated/period-life-table";

export const SAFE_WITHDRAWAL = cite(
  { morningstar2026: 0.039, horizonYears: 30, successRate: 0.9, classicRule: 0.04 },
  "official",
  2026,
  SRC.morningstarSwr2026,
  "Morningstar's starting safe withdrawal rate for 2026: 30 years, 90% probability of not running out, inflation-adjusted spending.",
);
export const TRINITY_SOURCE = SRC.trinityStudy;

/** Period life table figures at 65 and 70 (SSA 2023 period table, 2026 Trustees Report), computed from the generated table. */
const r1 = (x: number) => Math.round(x * 10) / 10;
const odds = (col: 2 | 5, from: number, to: number) => Math.round((PERIOD_LIFE_TABLE[to][col] / PERIOD_LIFE_TABLE[from][col]) * 100);
export const PERIOD_LIFE = cite(
  {
    male65: r1(PERIOD_LIFE_TABLE[65][3]),
    female65: r1(PERIOD_LIFE_TABLE[65][6]),
    male70: r1(PERIOD_LIFE_TABLE[70][3]),
    female70: r1(PERIOD_LIFE_TABLE[70][6]),
    male65to90: odds(2, 65, 90),
    female65to90: odds(5, 65, 90),
    male65to85: odds(2, 65, 85),
    female65to85: odds(5, 65, 85),
    male65to100: odds(2, 65, 100),
    female65to100: odds(5, 65, 100),
  },
  "official",
  2023,
  SRC.ssaPeriodLife,
  "Remaining years of life and % chance of reaching an age, from SSA's period life table.",
);
