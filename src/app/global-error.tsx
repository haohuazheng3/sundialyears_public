"use client";

import { useEffect } from "react";

/** Last-resort boundary (root layout failed). Plain HTML, no dependencies. */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    const e = error as Error;
    try {
      const body = JSON.stringify({ kind: "global", name: e?.name ?? "Error", message: e?.message ?? String(error), stack: e?.stack ?? null, url: location.pathname });
      navigator.sendBeacon?.("/api/errors", new Blob([body], { type: "application/json" }));
    } catch {
      /* ignore */
    }
  }, [error]);
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#f4f1ea", color: "#1d1b17", padding: "4rem 1.5rem" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", background: "#fff", borderRadius: 26, padding: "2.5rem", boxShadow: "0 30px 60px -30px rgba(0,0,0,.25)" }}>
          <h1 style={{ fontSize: 28, margin: 0 }}>Sundial Years hit a snag.</h1>
          <p style={{ fontSize: 18, lineHeight: 1.6 }}>We’ve been notified. Please try again.</p>
          <button onClick={() => retry()} style={{ fontSize: 17, fontWeight: 700, padding: "14px 22px", borderRadius: 999, border: 0, background: "#1d1b17", color: "#f4f1ea" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
