"use client";

import { useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/ui/Icon";
import { track } from "@/lib/analytics";
import { STORAGE_KEYS } from "./policy";

/** Same key the cookie notice (src/components/site/CookieNotice.tsx) writes: {"v":"all"|"essential","at":<ms>}. */
export const CONSENT_KEY = STORAGE_KEYS.consent;

const noopSubscribe = () => () => {};
/** Re-read when the cookie notice on this same page records a choice ("sy-consent") or another tab changes storage. */
const subscribeConsent = (cb: () => void) => {
  window.addEventListener("sy-consent", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("sy-consent", cb);
    window.removeEventListener("storage", cb);
  };
};
const BLOCKED = "\u0000blocked";

type Stored = { kind: "loading" } | { kind: "blocked" } | { kind: "none" } | { kind: "set"; choice: string; at: number | null };

function parse(raw: string | null | undefined): Stored {
  if (raw === undefined) return { kind: "loading" };
  if (raw === null) return { kind: "none" };
  if (raw === BLOCKED) return { kind: "blocked" };
  try {
    const v = JSON.parse(raw) as { v?: unknown; at?: unknown };
    return { kind: "set", choice: typeof v.v === "string" ? v.v : "unknown", at: typeof v.at === "number" ? v.at : null };
  } catch {
    return { kind: "set", choice: "unknown", at: null };
  }
}

const LABEL: Record<string, string> = {
  all: "Accept all",
  essential: "Essential only",
};

/**
 * Shows the visitor's saved cookie choice and lets them reset it: removes `sy_consent_v1` and reloads,
 * so the cookie notice appears again and they can choose afresh. Also tells them if their browser sends
 * Global Privacy Control (GPC), and shows this browser's FlowGlance visitor ID (`_fw_vid`) so a deletion request
 * (privacy policy → "Analytics data") doesn't require opening developer tools.
 * Static HTML renders the loading state; the real values appear after hydration.
 */
export function CookieChoice() {
  const raw = useSyncExternalStore(
    subscribeConsent,
    () => {
      try {
        return localStorage.getItem(CONSENT_KEY);
      } catch {
        return BLOCKED;
      }
    },
    () => undefined,
  );
  const gpc = useSyncExternalStore(
    noopSubscribe,
    () => (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true,
    () => false,
  );
  const visitorId = useSyncExternalStore(
    noopSubscribe,
    () => {
      try {
        return localStorage.getItem(STORAGE_KEYS.fwVisitor);
      } catch {
        return null;
      }
    },
    () => null,
  );
  const [resetting, setResetting] = useState(false);
  const [failed, setFailed] = useState(false);
  const s = parse(raw);

  let current: React.ReactNode;
  if (s.kind === "loading")
    current = (
      <>
        <span className="skeleton inline-block h-5 w-40 align-middle" aria-hidden="true" />
        <span className="sr-only">Checking…</span>
      </>
    );
  else if (s.kind === "blocked") current = "Your browser is blocking site storage, so no choice can be saved here. Change it in your browser’s privacy settings.";
  else if (s.kind === "none") current = "You haven’t chosen yet — the notice at the bottom of the screen is waiting for you.";
  else
    current = (
      <>
        <strong className="text-ink">{LABEL[s.choice] ?? "Saved"}</strong>
        {s.at ? (
          <>
            {" "}
            — chosen on {new Date(s.at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </>
        ) : null}
        .
      </>
    );

  return (
    <div className="sunk p-5 sm:p-6">
      <p className="text-[1.0625rem] leading-relaxed text-ink-2" aria-live="polite">
        <span className="font-bold text-ink">Your current choice on this browser: </span>
        {current}
      </p>
      {gpc ? (
        <p className="mt-3 flex gap-2 text-[1.0625rem] leading-relaxed text-ink-2">
          <Icon name="shield" size={20} className="mt-0.5 shrink-0 text-sage" />
          <span>
            Your browser is sending a <strong className="text-ink">Global Privacy Control</strong> signal. We treat it as “Essential only” for
            advertising, whatever you choose below.
          </span>
        </p>
      ) : null}
      {visitorId ? (
        <p className="mt-3 text-[1.0625rem] leading-relaxed text-ink-2">
          <span className="font-bold text-ink">Your analytics ID on this browser: </span>
          <code className="select-all break-all">{visitorId}</code>. It is a random code, not your name. To have the analytics data linked to it
          deleted, send it to us.
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn btn-primary"
          disabled={resetting || s.kind === "blocked"}
          onClick={() => {
            setResetting(true);
            setFailed(false);
            track("cookie_choice_reset", { previous: s.kind === "set" ? s.choice : s.kind });
            try {
              localStorage.removeItem(CONSENT_KEY);
            } catch {
              setResetting(false);
              setFailed(true);
              return;
            }
            window.location.reload();
          }}
        >
          <Icon name={resetting ? "check" : "close"} size={19} />
          {resetting ? "Cleared — reloading…" : "Change my cookie choice"}
        </button>
        <span className="text-[0.9375rem] text-ink-3">The page reloads and the cookie notice appears again.</span>
      </div>
      {failed ? (
        <p role="alert" className="mt-3 text-[1rem] text-ember">
          Your browser didn’t let us clear the setting. You can remove it by clearing this site’s data in your browser settings.
        </p>
      ) : null}
    </div>
  );
}
