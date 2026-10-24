import { nameOf, type StateTax } from "@/data/states";
import type { FaqItem } from "@/components/tool/Faq";

/** First sentence of a data sentence block (splits at ". " followed by a capital, so "$1.5 million" stays whole). */
export function firstSentence(text: string) {
  const m = text.match(/^.*?[.!?](?=\s+[A-Z“"(]|$)/);
  return m ? m[0] : text;
}

const ANSWER_WORD = { no: "No.", partially: "Partly.", yes: "Yes." } as const;

/** AP-style possessive: "Ohio’s", "Texas’". */
export const possessive = (name: string) => (name.endsWith("s") ? `${name}’` : `${name}’s`);

/** "No." / "Partly." etc. — the answer word that opens each state page. */
export function shortAnswer(s: StateTax): string {
  if (!s.hasBroadIncomeTax) return "No.";
  const ss = s.socialSecurity.taxed;
  const p = s.pensions.taxed;
  const i = s.iraAnd401k.taxed;
  if (ss === "no" && p === "no" && i === "no") return "Not on Social Security, pensions or IRA withdrawals.";
  if (ss === "no" && p === "yes" && i === "yes") return "Yes — everything except Social Security.";
  if (ss === "yes") return "Yes, including Social Security.";
  return "Partly.";
}

/** One-line rate answer, e.g. "5.75% top rate" or "No broad income tax". */
export function rateAnswer(s: StateTax) {
  const r = s.rates;
  if (r.type === "none") return `${nameOf(s)} has no broad income tax.`;
  if (r.type === "flat" && r.flatRate === r.topRate) return `A flat ${r.topRate}%.`;
  if (r.type === "flat") return `A flat ${r.flatRate}% on most income; ${r.topRate}% at the top.`;
  return `${r.brackets?.length ? `${r.brackets.length} brackets, ` : ""}topping out at ${r.topRate}%.`;
}

/** 3–5 state-specific FAQs (FAQPage). Answers come straight from the verified data. */
export function stateFaq(s: StateTax): FaqItem[] {
  const n = nameOf(s);
  const items: FaqItem[] = [];
  if (!s.hasBroadIncomeTax) {
    items.push({ q: `Does ${n} tax Social Security or pensions?`, a: `No. ${s.socialSecurity.summary} ${s.socialSecurity.detail}` });
    items.push({ q: `Are IRA withdrawals and RMDs taxed in ${n}?`, a: `No. ${s.iraAnd401k.summary} ${s.iraAnd401k.detail}` });
    items.push({
      q: `Is ${n} tax-friendly for retirees?`,
      a: `We rate ${n} “${s.verdict.label}” for 2026. ${s.noTaxNote ?? ""} Our rating covers state income tax only — not property or sales taxes, which can still matter.`,
    });
    items.push({ q: `Is military retirement pay taxed in ${n}?`, a: `No. ${s.military.summary}` });
  } else {
    items.push({
      q: `Is ${n} tax-friendly for retirees?`,
      a: `We rate ${n} “${s.verdict.label}” for 2026. ${s.socialSecurity.summary} ${s.relief.headline} The top income tax rate is ${s.rates.topRate}%.`,
    });
    items.push({
      q: `Are required minimum distributions (RMDs) taxed in ${n}?`,
      a: `RMDs are withdrawals from IRAs and 401(k)-type plans, so they follow ${possessive(n)} rules for those accounts. ${s.iraAnd401k.summary}`,
    });
    items.push({ q: `Is military retirement pay taxed in ${n}?`, a: `${ANSWER_WORD[s.military.taxed]} ${s.military.summary}` });
    if (!s.faqExtra?.length) items.push({ q: `What is ${possessive(n)} income tax rate for 2026?`, a: s.rates.summary });
  }
  return [...items, ...(s.faqExtra ?? [])].slice(0, 5);
}
