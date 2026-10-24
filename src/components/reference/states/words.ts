const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];

/** 9 → "nine" (up to twenty; larger numbers stay digits). */
export const numberWord = (n: number) => WORDS[n] ?? String(n);
export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** ["A","B","C"] → "A, B and C". */
export function listJoin(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** "41 states and DC" / "9 states" — counts DC separately so we never call it a state. */
export function statesPhrase(codes: string[]) {
  const dc = codes.includes("DC");
  const n = codes.length - (dc ? 1 : 0);
  return `${n} state${n === 1 ? "" : "s"}${dc ? " and DC" : ""}`;
}
