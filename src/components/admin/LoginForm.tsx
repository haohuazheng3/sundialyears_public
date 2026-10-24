"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { identify } from "@/lib/analytics";
import { Icon } from "@/components/ui/Icon";

type LoginResponse = { ok: true; identify?: { userRef: string; email?: string | null } } | { ok: false; error?: string };

/**
 * Owner sign-in → POST /api/admin/login. On success the API sets the httpOnly `sy_admin` cookie; we tell FlowGlance
 * who this browser is (so owner visits are excluded from visitor stats) and go to the dashboard.
 */
export function LoginForm() {
  const id = useId();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!password) {
      setError("Enter the admin password.");
      return;
    }
    setStatus("sending");
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json().catch(() => null)) as LoginResponse | null;
      if (!res.ok || !data || !data.ok) {
        setStatus("idle");
        setError((data && !data.ok && data.error) || `Sign-in failed (HTTP ${res.status}).`);
        return;
      }
      if (data.identify?.userRef) identify(data.identify.userRef, data.identify.email ?? undefined);
      setStatus("done");
      router.push("/admin");
      router.refresh();
    } catch {
      setStatus("idle");
      setError("Couldn’t reach the server. Check your connection and try again.");
    }
  }

  const busy = status !== "idle";
  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-5" noValidate>
      <div>
        <label htmlFor={`${id}-pw`} className="field-label">
          Password
        </label>
        <div className="input-affix">
          <input
            id={`${id}-pw`}
            name="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            className="input pr-24"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-err` : undefined}
            required
            autoFocus
          />
          <button
            type="button"
            className="btn btn-quiet absolute right-1.5 top-1/2 -translate-y-1/2 !min-h-10 text-[0.95rem]"
            onClick={() => setShow((v) => !v)}
            aria-controls={`${id}-pw`}
          >
            {/* The visible word changes, so no aria-pressed (that would announce "Hide, pressed" — a double signal). */}
            {show ? "Hide" : "Show"}
            <span className="sr-only"> password</span>
          </button>
        </div>
      </div>
      {error ? (
        <p id={`${id}-err`} role="alert" className="flex items-start gap-2 rounded-[var(--r-md)] bg-ember-wash px-4 py-3 text-[1rem] font-semibold text-ember">
          <Icon name="warn" size={19} className="mt-0.5 shrink-0" /> {error}
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary w-full" disabled={busy}>
        {status === "sending" ? "Signing in…" : status === "done" ? "Opening dashboard…" : "Sign in"}
      </button>
    </form>
  );
}
