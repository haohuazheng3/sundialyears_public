import type { Status } from "./params/types";
import { SRC } from "./params/sources";

export interface KeyDate {
  date: string; // display text
  iso: string; // sortable (first day of the window)
  title: string;
  detail: string;
  status: Status | "done";
  href?: string;
  source?: { label: string; url: string };
}

/** The retirement calendar for the 2026→2027 turnover. Past items stay as context ("done"). */
export const KEY_DATES: KeyDate[] = [
  { date: "Oct 14, 2026", iso: "2026-10-14", title: "SSA announced the 2027 COLA: 3.6%", detail: "Biggest raise since 2024's 3.2%. Also set the 2027 earnings-test limits and taxable maximum.", status: "done", href: "/social-security-cola", source: SRC.ssaPress20261014 },
  { date: "Oct 15 – Dec 7, 2026", iso: "2026-10-15", title: "Medicare Open Enrollment", detail: "Switch Part D or Medicare Advantage plans for 2027. Changes take effect January 1.", status: "official", href: "/medicare-premium-calculator", source: SRC.medicareGovPartB },
  { date: "Mid-November 2026", iso: "2026-11-15", title: "CMS publishes 2027 Part B premium & IRMAA brackets", detail: "Trustees project $209.50/month. We update every number here the day CMS publishes.", status: "projected", href: "/irmaa-brackets-2027", source: SRC.medicareTrustees2026 },
  { date: "Early December 2026", iso: "2026-12-01", title: "Your 2027 benefit letter arrives", detail: "SSA posts COLA notices in my Social Security showing your new benefit after Medicare premiums.", status: "official", href: "/social-security-cola", source: SRC.ssaCola2027 },
  { date: "Dec 31, 2026", iso: "2026-12-31", title: "Deadline: 2026 RMDs and QCDs", detail: "Everyone past their first RMD year must withdraw by year-end; QCDs must leave the IRA by Dec 31 to count for 2026.", status: "official", href: "/rmd-calculator", source: SRC.irsRmdFaq },
  { date: "January 2027", iso: "2027-01-01", title: "First checks with the 3.6% raise", detail: "Social Security payments rise in January; SSI rises with the December 31, 2026 payment.", status: "official", href: "/social-security-cola", source: SRC.ssaCola2027 },
  { date: "Jan 1 – Mar 31, 2027", iso: "2027-01-02", title: "Medicare Part B General Enrollment Period", detail: "If you missed your window, this is when you can sign up — late penalties may apply.", status: "official", href: "/medicare-premium-calculator", source: SRC.medicareGovPenalty },
  { date: "Apr 1, 2027", iso: "2027-04-01", title: "First-RMD deadline for people born in 1953", detail: "Turned 73 in 2026? Your first RMD can wait until April 1 — but then you take two in 2027.", status: "official", href: "/rmd/age-73", source: SRC.irsRmdFaq },
];
