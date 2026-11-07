"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function SiteError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    const e = error as Error & { digest?: string };
    (window as unknown as { __syReportError?: (p: object) => void }).__syReportError?.({
      kind: "boundary",
      name: e?.name ?? "Error",
      message: e?.message ?? String(error),
      stack: e?.stack ?? null,
    });
  }, [error]);
  return (
    <div className="mx-auto max-w-[760px] px-4 py-16 sm:px-6">
      <div className="float p-8 sm:p-10" role="alert">
        <p className="eyebrow">Something went wrong</p>
        <h1 className="mt-3 text-[2rem] font-semibold">This part of the page didn’t load.</h1>
        <p className="mt-3 text-[1.0625rem] text-ink-2">We’ve been notified automatically. Trying again usually fixes it.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" className="btn btn-primary" onClick={() => retry()}>
            Try again
          </button>
          <Link href="/" className="btn btn-ghost">
            Go to the home page
          </Link>
        </div>
      </div>
    </div>
  );
}
