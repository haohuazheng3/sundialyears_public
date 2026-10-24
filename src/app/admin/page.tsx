import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/server/admin";
import { hasDb } from "@/lib/db/client";
import { environment } from "@/lib/server/errors";
import { Icon } from "@/components/ui/Icon";
import { AdminToolbar } from "@/components/admin/AdminToolbar";
import { ErrorGroups, type ErrorGroupRow } from "@/components/admin/ErrorGroups";
import { AdminTable, EmptyNote, LoadError, Panel, StatusPill, type Tone } from "@/components/admin/ui";
import { ERROR_LIMIT, fmtTs, internalHref, loadContacts, loadFeedback, loadInbox, loadOpenErrors, loadSourceWatch, parseAuthResults } from "./_lib/data";

export const metadata: Metadata = { title: "Dashboard" };

const SECTIONS = [
  { id: "errors", label: "Errors" },
  { id: "messages", label: "Messages" },
  { id: "feedback", label: "Feedback" },
  { id: "inbox", label: "Test inbox" },
  { id: "sources", label: "Source watch" },
];

/**
 * Owner dashboard. The session cookie and the database are request-time data, so with Cache Components they are read
 * inside <Suspense>: the chrome and skeleton prerender, the dashboard streams in (or redirects to sign-in).
 */
export default function AdminPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
      <div className="skeleton h-12 w-72" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="skeleton h-24" />
        ))}
      </div>
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="skeleton h-64" />
      ))}
    </div>
  );
}

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : null);

async function Dashboard() {
  if (!(await isAdmin())) redirect("/admin/login");

  const env = environment();
  if (!hasDb()) {
    return (
      <div className="space-y-6">
        <DashboardHeader env={env} />
        <LoadError what="the dashboard" error="DATABASE_URL is not set in this environment." logged={false} />
      </div>
    );
  }

  const [errors, contacts, feedback, inbox, sources] = await Promise.all([loadOpenErrors(), loadContacts(), loadFeedback(), loadInbox(), loadSourceWatch()]);

  const errorRows: ErrorGroupRow[] = errors.ok
    ? errors.data.map((e) => ({ ...e, stack: e.stack ? e.stack.slice(0, 4000) : null, firstSeen: fmtTs(e.firstSeen), lastSeen: fmtTs(e.lastSeen) }))
    : [];
  const votes = feedback.ok ? feedback.data.totals.votes : 0;
  const helpful = feedback.ok ? feedback.data.totals.helpful : 0;
  const changedSources = sources.ok ? sources.data.filter((s) => s.note === "key phrases present").length : 0;

  const tiles: { label: string; value: string; sub: string; href: string; tone: Tone }[] = [
    {
      label: "Open error groups",
      value: errors.ok ? (errorRows.length >= ERROR_LIMIT ? `${ERROR_LIMIT}+` : String(errorRows.length)) : "—",
      sub: errors.ok ? (errorRows.length ? "Needs a look" : "All clear") : "Failed to load",
      href: "#errors",
      tone: !errors.ok || errorRows.length ? "bad" : "good",
    },
    {
      label: "New messages",
      value: contacts.ok ? String(contacts.data.unread) : "—",
      sub: contacts.ok ? `${contacts.data.rows.length} shown below` : "Failed to load",
      href: "#messages",
      tone: contacts.ok && contacts.data.unread ? "warn" : contacts.ok ? "good" : "bad",
    },
    {
      label: "Feedback helpful",
      value: pct(helpful, votes) == null ? "—" : `${pct(helpful, votes)}%`,
      sub: feedback.ok ? `${votes.toLocaleString("en-US")} votes` : "Failed to load",
      href: "#feedback",
      tone: !feedback.ok ? "bad" : votes === 0 ? "neutral" : (pct(helpful, votes) ?? 0) >= 70 ? "good" : "warn",
    },
    {
      label: "Last test email",
      value: inbox.ok && inbox.data[0] ? fmtTs(inbox.data[0].receivedAt).replace(/, \d{4},/, ",") : "—",
      sub: inbox.ok ? `${inbox.data.length} recent` : "Failed to load",
      href: "#inbox",
      tone: inbox.ok ? "neutral" : "bad",
    },
    {
      label: "Sources published",
      value: sources.ok ? `${changedSources}/${sources.data.length}` : "—",
      sub: sources.ok ? "Key phrases found" : "Failed to load",
      href: "#sources",
      tone: !sources.ok ? "bad" : changedSources ? "warn" : "neutral",
    },
  ];

  return (
    <div className="space-y-8">
      <DashboardHeader env={env} />

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {tiles.map((t) => (
          <li key={t.label}>
            <a href={t.href} className="float-soft float-lift block h-full p-4">
              <span className="block text-[0.92rem] font-semibold text-ink-3">{t.label}</span>
              <span className="num mt-1 block font-display text-[1.9rem] font-semibold leading-tight text-ink">{t.value}</span>
              <span className="mt-2 block">
                <StatusPill tone={t.tone}>{t.sub}</StatusPill>
              </span>
            </a>
          </li>
        ))}
      </ul>

      <Panel id="errors" title="Open errors" icon="warn" meta={<span className="pill">{env}</span>}>
        {errors.ok ? <ErrorGroups rows={errorRows} /> : <LoadError what="errors" error={errors.error} />}
      </Panel>

      <Panel id="messages" title="Contact messages" icon="mail" meta={contacts.ok ? <span className="pill">latest {contacts.data.rows.length}</span> : null}>
        {!contacts.ok ? (
          <LoadError what="contact messages" error={contacts.error} />
        ) : contacts.data.rows.length === 0 ? (
          <EmptyNote>No messages yet.</EmptyNote>
        ) : (
          <ul className="space-y-3">
            {contacts.data.rows.map((m) => (
              <li key={m.id} className="sunk p-4">
                <div className="flex flex-wrap items-center gap-2 text-[0.95rem]">
                  <span className="num font-bold text-ink">#{m.id}</span>
                  <span className="text-ink-3">{fmtTs(m.createdAt)}</span>
                  <span className="pill pill-sky">{m.topic}</span>
                  <StatusPill tone={m.status === "new" ? "warn" : m.status === "spam" ? "bad" : "neutral"}>{m.status}</StatusPill>
                  <StatusPill tone={m.notified ? "good" : "bad"}>{m.notified ? "Owner emailed" : "Email not sent"}</StatusPill>
                </div>
                <p className="mt-2 break-words font-semibold text-ink">
                  {m.name ? `${m.name} · ` : ""}
                  <a className="link" href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: your message to Sundial Years (#${m.id})`)}`}>
                    {m.email}
                  </a>
                  {m.page ? <span className="font-normal text-ink-3"> · from {m.page}</span> : null}
                </p>
                <p className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words text-[1rem] leading-relaxed text-ink-2">{m.message}</p>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        id="feedback"
        title="Feedback by page"
        icon="chart"
        meta={
          feedback.ok ? (
            <span className="pill">
              {votes.toLocaleString("en-US")} votes · {feedback.data.totals.pages.toLocaleString("en-US")} pages
              {feedback.data.totals.pages > feedback.data.pages.length ? ` (top ${feedback.data.pages.length} shown)` : ""}
            </span>
          ) : null
        }
      >
        {!feedback.ok ? (
          <LoadError what="feedback" error={feedback.error} />
        ) : feedback.data.pages.length === 0 ? (
          <EmptyNote>No feedback votes yet.</EmptyNote>
        ) : (
          <div className="space-y-6">
            <AdminTable label="Feedback by page">
              <thead>
                <tr>
                  <th>Page</th>
                  <th>Votes</th>
                  <th>Helpful</th>
                  <th>Comments</th>
                  <th>Last vote</th>
                </tr>
              </thead>
              <tbody>
                {feedback.data.pages.map((p) => {
                  const share = pct(p.helpful, p.votes) ?? 0;
                  const href = internalHref(p.page);
                  return (
                    <tr key={p.page}>
                      <td className="strong break-all">
                        {href ? (
                          <a href={href} className="link" target="_blank" rel="noopener">
                            {p.page}
                          </a>
                        ) : (
                          p.page
                        )}
                      </td>
                      <td className="num">{p.votes}</td>
                      <td>
                        <span className="flex items-center gap-2">
                          <span className="num w-12 font-bold text-ink">{share}%</span>
                          <span className="h-2 w-24 overflow-hidden rounded-full bg-[var(--hairline-2)]" aria-hidden="true">
                            <span className={`block h-full rounded-full ${share >= 70 ? "bg-sage" : share >= 50 ? "bg-sun" : "bg-ember"}`} style={{ width: `${share}%` }} />
                          </span>
                          <span className="text-[0.9rem] text-ink-3">
                            {p.helpful} yes / {p.votes - p.helpful} no
                          </span>
                        </span>
                      </td>
                      <td className="num">{p.comments}</td>
                      <td className="whitespace-nowrap">{fmtTs(p.last)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </AdminTable>
            {feedback.data.comments.length ? (
              <div>
                <h3 className="text-[1.15rem] font-semibold">Latest comments</h3>
                <ul className="mt-3 space-y-2">
                  {feedback.data.comments.map((c) => (
                    <li key={c.id} className="sunk p-3 text-[1rem]">
                      <p className="flex flex-wrap items-center gap-2 text-[0.92rem] text-ink-3">
                        <StatusPill tone={c.helpful ? "good" : "bad"}>{c.helpful ? "Helpful" : "Not quite"}</StatusPill>
                        <span className="break-all">{c.page}</span>
                        <span>{fmtTs(c.createdAt)}</span>
                      </p>
                      <p className="mt-1.5 whitespace-pre-wrap break-words text-ink-2">{c.comment}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </Panel>

      <Panel id="inbox" title="Test inbox" icon="mail" meta={<span className="pill">latest 10</span>}>
        {!inbox.ok ? (
          <LoadError what="the test inbox" error={inbox.error} />
        ) : inbox.data.length === 0 ? (
          <EmptyNote>Nothing received yet. Send a message to the test address to check delivery and authentication.</EmptyNote>
        ) : (
          <AdminTable label="Test inbox messages">
            <thead>
              <tr>
                <th>Received</th>
                <th>From → To</th>
                <th>Subject</th>
                <th>Authentication</th>
              </tr>
            </thead>
            <tbody>
              {inbox.data.map((m) => {
                const auth = parseAuthResults(m.authResults);
                return (
                  <tr key={m.id}>
                    <td className="whitespace-nowrap">{fmtTs(m.receivedAt)}</td>
                    <td className="break-all">
                      <span className="text-ink">{m.fromAddr}</span> → {m.toAddr}
                    </td>
                    <td className="break-words">{m.subject || <span className="text-ink-3">(no subject)</span>}</td>
                    <td>
                      {auth.length ? (
                        <span className="flex flex-wrap gap-1.5">
                          {auth.map((a) => (
                            <StatusPill key={a.check} tone={a.result === "pass" ? "good" : a.result === "none" || a.result === "neutral" ? "warn" : "bad"}>
                              {a.check} {a.result}
                            </StatusPill>
                          ))}
                        </span>
                      ) : (
                        <span className="text-ink-3">No Authentication-Results header</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </AdminTable>
        )}
      </Panel>

      <Panel id="sources" title="Source watch" icon="source" meta={sources.ok ? <span className="pill">{sources.data.length} pages</span> : null}>
        {!sources.ok ? (
          <LoadError what="the source watch" error={sources.error} />
        ) : sources.data.length === 0 ? (
          <EmptyNote>The watcher hasn’t run yet (Vercel Cron, /api/cron/source-watch).</EmptyNote>
        ) : (
          <AdminTable label="Watched official sources">
            <thead>
              <tr>
                <th>Source</th>
                <th>Status</th>
                <th>Last checked</th>
                <th>Last changed</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {sources.data.map((s) => (
                <tr key={s.id} className={s.note === "key phrases present" ? "is-hit" : undefined}>
                  <td className="strong">
                    <a href={s.url} target="_blank" rel="noopener" className="link">
                      {s.label}
                    </a>
                  </td>
                  <td>
                    <StatusPill tone={s.lastStatus === 200 ? "good" : s.lastStatus === 0 || s.lastStatus == null ? "bad" : "warn"}>
                      {s.lastStatus == null ? "Never" : s.lastStatus === 0 ? "Fetch error" : `HTTP ${s.lastStatus}`}
                    </StatusPill>
                  </td>
                  <td className="whitespace-nowrap">{fmtTs(s.lastCheckedAt)}</td>
                  <td className="whitespace-nowrap">{fmtTs(s.lastChangedAt)}</td>
                  <td className="break-words">{s.note ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        )}
      </Panel>
    </div>
  );
}

function DashboardHeader({ env }: { env: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="eyebrow flex items-center gap-2">
          <Icon name="shield" size={15} /> Owner dashboard · {env}
        </p>
        <h1 className="mt-2 text-[2.2rem] font-semibold leading-tight">Sundial Years admin</h1>
        <nav aria-label="Dashboard sections" className="mt-3 flex flex-wrap gap-2">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="pill hover:text-ink">
              {s.label}
            </a>
          ))}
        </nav>
      </div>
      <AdminToolbar />
    </div>
  );
}
