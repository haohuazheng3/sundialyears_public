import { cite } from "./types";
import { SRC } from "./sources";

/** Qualifying longevity annuity contract (QLAC) limit (IRS Notice 2025-67; Treas. Reg. §1.401(a)(9)-6(q)). */
export const QLAC = cite({ limit: 210000, latestStartAge: 85 }, "official", 2026, SRC.irsNotice202567, "Per person, across all IRAs and plans; the old 25%-of-balance cap was repealed by SECURE 2.0.");
