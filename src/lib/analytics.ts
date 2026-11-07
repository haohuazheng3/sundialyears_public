"use client";
/** FlowGlance custom events (the stub in <head> queues calls until fw.js loads). */
type Fw = (cmd: "event" | "identify", a: unknown, b?: unknown) => void;

export function track(name: string, props?: Record<string, unknown>) {
  try {
    (window as unknown as { fw?: Fw }).fw?.("event", name, props);
  } catch {
    /* analytics must never break the UI */
  }
}

export function identify(userRef: string, email?: string) {
  try {
    (window as unknown as { fw?: Fw }).fw?.("identify", { userRef, email });
  } catch {
    /* ignore */
  }
}
