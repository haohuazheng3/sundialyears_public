"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

/**
 * Refresh (re-runs the server queries) and Sign out (POST /api/admin/logout → /admin/login).
 * Sign-out only leaves the dashboard once the server has cleared the session cookie: on a failure the owner must not
 * land on the sign-in page believing they are signed out (e.g. on a shared computer) while the cookie is still valid.
 */
export function AdminToolbar() {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [signingOut, setSigningOut] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function signOut() {
    setSigningOut(true);
    setProblem(null);
    try {
      const res = await fetch("/api/admin/logout", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      setSigningOut(false);
      setProblem(`Sign-out failed (${e instanceof Error ? e.message : String(e)}). You are still signed in — try again.`);
      return;
    }
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-ghost" disabled={refreshing} onClick={() => startRefresh(() => router.refresh())}>
          <Icon name="spark" size={18} /> {refreshing ? "Refreshing…" : "Refresh"}
        </button>
        <button type="button" className="btn btn-primary" disabled={signingOut} onClick={() => void signOut()}>
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
      {problem ? (
        <p role="alert" className="max-w-sm rounded-[var(--r-md)] bg-ember-wash px-4 py-2 text-[0.95rem] font-semibold text-ember">
          {problem}
        </p>
      ) : null}
    </div>
  );
}
