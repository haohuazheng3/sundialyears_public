export type Status = "official" | "projected" | "not_yet_announced";

export interface Source {
  label: string;
  url: string;
  publisher: "SSA" | "CMS" | "IRS" | "Treasury" | "BLS" | "Congress" | "Federal Register" | "eCFR" | "HHS" | "State" | "PBGC" | "Research";
  published?: string; // ISO date the agency published it
}

/** A number (or structure) we show to users, with where it came from and whether it is final. */
export interface Cited<T> {
  value: T;
  status: Status;
  year: number | string;
  source: Source;
  note?: string;
}

export const cite = <T,>(value: T, status: Status, year: number | string, source: Source, note?: string): Cited<T> => ({
  value,
  status,
  year,
  source,
  note,
});
