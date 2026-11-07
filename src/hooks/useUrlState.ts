"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

type Codec<T> = { parse: (raw: string) => T | undefined; format: (v: T) => string };
export type Schema<S> = { [K in keyof S]: Codec<S[K]> };

export const num: Codec<number> = {
  parse: (r) => (r === "" || !Number.isFinite(Number(r)) ? undefined : Number(r)),
  format: (v) => String(v),
};
export const numOrNull: Codec<number | null> = {
  parse: (r) => (r === "" ? null : Number.isFinite(Number(r)) ? Number(r) : undefined),
  format: (v) => (v == null ? "" : String(v)),
};
export const str = <T extends string>(allowed?: readonly T[]): Codec<T> => ({
  parse: (r) => (!allowed || (allowed as readonly string[]).includes(r) ? (r as T) : undefined),
  format: (v) => v,
});
export const bool: Codec<boolean> = { parse: (r) => (r === "1" ? true : r === "0" ? false : undefined), format: (v) => (v ? "1" : "0") };
export const date: Codec<{ year: number; month: number; day: number }> = {
  parse: (r) => {
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(r);
    if (!m) return undefined;
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return undefined;
    return { year: y, month: mo, day: d };
  },
  format: (v) => `${v.year}-${v.month}-${v.day}`,
};

const noopSubscribe = () => () => {};

/**
 * Calculator state that survives refresh and can be shared as a link.
 * The static HTML renders with `defaults` (good for SEO, no hydration mismatch); right after hydration the URL is
 * applied (useSyncExternalStore: server snapshot null → client snapshot).
 * Privacy: user edits are written to the URL FRAGMENT (#dob=…&bal=…), which browsers never send to servers,
 * analytics or ad requests. Inbound links may still use the query string (e.g. ?rmd=18868 from another tool);
 * those keys are read once and moved into the fragment on the first edit.
 */
export function useUrlState<S extends Record<string, unknown>>(defaults: S, schema: Schema<S>) {
  const search = useSyncExternalStore(noopSubscribe, () => `${window.location.search}|${window.location.hash}`, () => null);
  const [edited, setEdited] = useState<S | null>(null);
  const hydrated = search !== null;

  const fromUrl = (): S => {
    if (!search) return defaults;
    const [q, h] = search.split("|");
    const fromQuery = new URLSearchParams(q);
    const fromHash = new URLSearchParams((h ?? "").replace(/^#/, ""));
    const next = { ...defaults };
    for (const k of Object.keys(schema) as (keyof S)[]) {
      const raw = fromHash.get(String(k)) ?? fromQuery.get(String(k));
      if (raw == null) continue;
      const v = schema[k].parse(raw);
      if (v !== undefined) next[k] = v;
    }
    return next;
  };
  const state: S = edited ?? fromUrl();

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!edited) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const query = new URLSearchParams(window.location.search);
      const frag = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      for (const k of Object.keys(schema) as (keyof S)[]) {
        query.delete(String(k)); // calculator inputs never stay in the query string
        const v = edited[k];
        if (JSON.stringify(v) === JSON.stringify(defaults[k])) frag.delete(String(k));
        else frag.set(String(k), schema[k].format(v as S[typeof k]));
      }
      const qs = query.toString();
      const hs = frag.toString();
      window.history.replaceState(window.history.state, "", `${window.location.pathname}${qs ? `?${qs}` : ""}${hs ? `#${hs}` : ""}`);
    }, 250);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edited]);

  const set = <K extends keyof S>(key: K, value: S[K]) => setEdited((prev) => ({ ...(prev ?? state), [key]: value }));
  const setState = (next: S | ((s: S) => S)) => setEdited((prev) => (typeof next === "function" ? (next as (s: S) => S)(prev ?? state) : next));
  return { state, set, setState, hydrated };
}
