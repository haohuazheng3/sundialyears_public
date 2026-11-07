import { STATES, hasBigExclusion, type StateCode, type Taxed, type VerdictLabel } from "@/data/states";
import { rateLabel } from "./style";

/** The slim, serializable slice of each state that the interactive hub table needs (keeps the client bundle small). */
export interface StateRow {
  code: StateCode;
  name: string;
  slug: string;
  ss: Taxed;
  pensions: Taxed;
  ira: Taxed;
  topRate: number;
  rate: string;
  verdict: VerdictLabel;
  noTax: boolean;
  big: boolean;
}

export function stateRows(): StateRow[] {
  return STATES.map((s) => ({
    code: s.code,
    name: s.name,
    slug: s.slug,
    ss: s.socialSecurity.taxed,
    pensions: s.pensions.taxed,
    ira: s.iraAnd401k.taxed,
    topRate: s.rates.topRate,
    rate: rateLabel(s.rates),
    verdict: s.verdict.label,
    noTax: !s.hasBroadIncomeTax,
    big: hasBigExclusion(s),
  }));
}
