// Client-side error capture → /api/errors (beacon, so it survives page unloads).
// Capped per page load and de-duplicated so one broken widget can't flood the inbox.
const sent = new Set<string>();
let budget = 8;

function report(payload: { name?: string; message: string; stack?: string | null; kind: string }) {
  try {
    const key = `${payload.name}|${payload.message}`.slice(0, 300);
    if (sent.has(key) || budget <= 0) return;
    sent.add(key);
    budget--;
    const body = JSON.stringify({
      ...payload,
      url: location.pathname + location.search,
      ua: navigator.userAgent,
    });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/errors", new Blob([body], { type: "application/json" }));
    else void fetch("/api/errors", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } });
  } catch {
    /* reporting must never throw inside an error handler */
  }
}

window.addEventListener("error", (event) => {
  // Ignore third-party script noise (ads, extensions): only same-origin errors carry a stack we can act on.
  if (event.filename && !event.filename.startsWith(location.origin)) return;
  const err = event.error as Error | undefined;
  report({ kind: "error", name: err?.name ?? "Error", message: err?.message ?? event.message, stack: err?.stack ?? null });
});

window.addEventListener("unhandledrejection", (event) => {
  const r = event.reason as Error | string | undefined;
  const message = typeof r === "string" ? r : r?.message ?? "Unhandled promise rejection";
  report({ kind: "unhandledrejection", name: typeof r === "object" && r ? r.name : "UnhandledRejection", message, stack: typeof r === "object" && r ? r.stack : null });
});

(window as unknown as { __syReportError: typeof report }).__syReportError = report;
