"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

export interface ErrorGroupRow {
  id: number;
  source: string;
  severity: string;
  name: string;
  message: string;
  topFrame: string | null;
  stack: string | null;
  route: string | null;
  count: number;
  firstSeen: string; // preformatted on the server (UTC)
  lastSeen: string;
}

/** Requests in flight at once when resolving many groups. */
const CONCURRENCY = 6;

async function resolveOne(id: number) {
  const res = await fetch("/api/admin/errors", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
  if (!res.ok) throw new Error(res.status === 401 ? "your session expired — sign in again" : `HTTP ${res.status}`);
}

/**
 * Open error groups with "Resolve" per row and "Resolve all" (POST /api/admin/errors {id} for each row shown).
 * "Resolve all" deliberately resolves only the groups on screen — never `{all: true}`, which would also close groups
 * that arrived after the page loaded or sit beyond the 100-row cap, without the owner ever seeing them.
 * Rows disappear on press (optimistic); any that fail come back with a message.
 */
export function ErrorGroups({ rows: initial }: { rows: ErrorGroupRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [prevInitial, setPrevInitial] = useState(initial);
  const [problem, setProblem] = useState<string | null>(null);
  const [busyAll, setBusyAll] = useState(false);

  // Fresh server data (after router.refresh) replaces the local copy.
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setRows(initial);
  }

  async function resolve(ids: number[]) {
    const gone = new Set(ids);
    const removed = rows.filter((r) => gone.has(r.id));
    setProblem(null);
    setRows((cur) => cur.filter((r) => !gone.has(r.id)));

    const failed: number[] = [];
    let firstError = "";
    for (let i = 0; i < ids.length; i += CONCURRENCY) {
      const batch = ids.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(batch.map(resolveOne));
      results.forEach((r, j) => {
        if (r.status === "rejected") {
          failed.push(batch[j]);
          firstError ||= r.reason instanceof Error ? r.reason.message : String(r.reason);
        }
      });
    }

    if (failed.length) {
      // Put back only the rows that failed (functional update: other resolves may have finished meanwhile).
      const back = new Set(failed);
      const order = new Map(initial.map((r, i) => [r.id, i]));
      setRows((cur) => {
        const shown = new Set(cur.map((r) => r.id));
        return [...cur, ...removed.filter((r) => back.has(r.id) && !shown.has(r.id))].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
      });
      setProblem(`Couldn’t resolve ${failed.length === 1 ? "1 group" : `${failed.length} groups`}: ${firstError}`);
    }
    if (failed.length < ids.length) router.refresh();
    setBusyAll(false);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[1rem] text-ink-2" aria-live="polite">
          {rows.length === 0 ? "No open error groups." : `${rows.length} open ${rows.length === 1 ? "group" : "groups"}, newest first.`}
        </p>
        {rows.length > 1 ? (
          <button
            type="button"
            className="btn btn-ghost"
            disabled={busyAll}
            onClick={() => {
              const ids = rows.map((r) => r.id);
              if (!window.confirm(`Mark the ${ids.length} error groups shown here as resolved?`)) return;
              setBusyAll(true);
              void resolve(ids);
            }}
          >
            <Icon name="check" size={18} /> {busyAll ? "Resolving…" : "Resolve all shown"}
          </button>
        ) : null}
      </div>
      {problem ? (
        <p role="alert" className="mb-4 rounded-[var(--r-md)] bg-ember-wash px-4 py-3 text-[1rem] font-semibold text-ember">
          {problem}
        </p>
      ) : null}
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.id} className="sunk p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2">
                  <span className={`pill ${r.severity === "warning" ? "pill-sun" : "pill-ember"}`}>
                    <Icon name="warn" size={14} strokeWidth={2.2} /> {r.severity}
                  </span>
                  <span className="pill">{r.source}</span>
                  <span className="pill num" title="Occurrences">
                    ×{r.count.toLocaleString("en-US")}
                  </span>
                </p>
                <p className="mt-2 break-words font-bold text-ink">
                  {r.name}: <span className="font-semibold text-ink-2">{r.message}</span>
                </p>
                <p className="mt-1 break-words text-[0.95rem] text-ink-3">
                  {r.route ? <code className="text-ink-2">{r.route}</code> : "no route"} · first {r.firstSeen} · last {r.lastSeen}
                </p>
                {r.topFrame ? <p className="mt-1 break-all font-mono text-[0.85rem] text-ink-3">{r.topFrame}</p> : null}
                {r.stack ? (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-[0.95rem] font-semibold text-sun-ink">Stack trace</summary>
                    <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-[var(--r-md)] bg-[var(--card)] p-3 font-mono text-[0.8rem] text-ink-2">
                      {r.stack}
                    </pre>
                  </details>
                ) : null}
              </div>
              <button type="button" className="btn btn-ghost shrink-0" onClick={() => void resolve([r.id])} aria-label={`Resolve error group ${r.id}: ${r.name}`}>
                <Icon name="check" size={18} /> Resolve
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
