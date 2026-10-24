"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/ui/Icon";
import { track } from "@/lib/analytics";
import { SITE } from "@/lib/site";
import {
  CONTACT_LIMITS,
  CONTACT_TOPICS,
  EMAIL_PATTERN,
  REPLY_PROMISE,
  isContactTopic,
  pageFromNavigation,
  type ContactTopic,
} from "./topics";

type Status = "idle" | "sending" | "sent" | "error";
type Field = "name" | "email" | "message";
type Errors = Partial<Record<Field, string>>;

const noopSubscribe = () => () => {};

const PLACEHOLDER: Record<ContactTopic, string> = {
  question: "What would you like to know? If it’s about your own numbers, tell us which calculator you used.",
  "number-looks-wrong": "Which number looks wrong, what did you expect, and where did you see the right one?",
  suggestion: "What should we add or change?",
  partnership: "Tell us who you are and what you have in mind.",
  other: "How can we help?",
};

function validate(v: { name: string; email: string; message: string }): Errors {
  const errs: Errors = {};
  if (v.name.trim().length > CONTACT_LIMITS.nameMax) errs.name = `Please keep your name under ${CONTACT_LIMITS.nameMax} characters.`;
  const email = v.email.trim();
  if (!email) errs.email = "Please enter your email address so we can reply.";
  else if (email.length > CONTACT_LIMITS.emailMax || !EMAIL_PATTERN.test(email))
    errs.email = "That email address doesn’t look complete. Check for a typo — it should look like name@example.com.";
  const msg = v.message.trim();
  if (msg.length < CONTACT_LIMITS.messageMin) errs.message = "Please write a few words so we know how to help.";
  else if (msg.length > CONTACT_LIMITS.messageMax)
    errs.message = `Please shorten your message to ${CONTACT_LIMITS.messageMax.toLocaleString("en-US")} characters or fewer.`;
  return errs;
}

/**
 * Contact form → POST /api/contact ({ ok, id } | { ok: false, error }).
 * - Topic and page can be preset by link (?topic=number-looks-wrong&page=/rmd-calculator); otherwise the page is taken
 *   from a same-site referrer. Nothing the visitor types is ever written to the URL.
 * - Validation is inline (after a field is left, or after the first send attempt), the button flips to "Sending…" on
 *   press, and failures keep the text and offer a retry plus a prefilled email as a fallback.
 * - "sy_hp" is a honeypot: hidden from people and screen readers; if it's filled we pretend success and send nothing.
 */
export function ContactForm() {
  const uid = useId();
  const ids = {
    name: `${uid}-name`,
    email: `${uid}-email`,
    topic: `${uid}-topic`,
    message: `${uid}-message`,
    honeypot: `${uid}-hp`,
    includePage: `${uid}-page`,
  };

  // URL + referrer after hydration (server snapshot null → static HTML uses defaults; no hydration mismatch).
  // JSON string so the snapshot is a stable primitive between renders.
  const nav = useSyncExternalStore(
    noopSubscribe,
    () => {
      let loadedPath: string | null = null;
      try {
        const entry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
        loadedPath = entry?.name ? new URL(entry.name).pathname : null;
      } catch {
        loadedPath = null;
      }
      return JSON.stringify({
        search: window.location.search,
        referrer: document.referrer,
        origin: window.location.origin,
        loadedPath,
        currentPath: window.location.pathname,
      });
    },
    () => null,
  );
  const fromNav = (() => {
    if (!nav) return { topic: null as ContactTopic | null, page: null as string | null };
    const n = JSON.parse(nav) as Parameters<typeof pageFromNavigation>[0];
    const t = new URLSearchParams(n.search).get("topic");
    return { topic: isContactTopic(t) ? t : null, page: pageFromNavigation(n) };
  })();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topicEdit, setTopicEdit] = useState<ContactTopic | null>(null);
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [includePage, setIncludePage] = useState(true);
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [attempted, setAttempted] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [serverError, setServerError] = useState<string | null>(null);
  const [sentId, setSentId] = useState<number | null>(null);

  const topic: ContactTopic = topicEdit ?? fromNav.topic ?? "question";
  const page = fromNav.page;
  const topicLabel = CONTACT_TOPICS.find((t) => t.value === topic)?.label ?? "Message";

  const errors = validate({ name, email, message });
  const show = (f: Field) => (touched[f] || attempted ? errors[f] : undefined);

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const successRef = useRef<HTMLHeadingElement>(null);
  const sendingRef = useRef(false);

  useEffect(() => {
    if (status === "sent") successRef.current?.focus();
  }, [status]);

  const submit = async () => {
    if (sendingRef.current) return;
    setAttempted(true);
    const errs = validate({ name, email, message });
    const first = (["name", "email", "message"] as const).find((f) => errs[f]);
    if (first) {
      (first === "name" ? nameRef : first === "email" ? emailRef : messageRef).current?.focus();
      return;
    }
    sendingRef.current = true;
    setStatus("sending");
    setServerError(null);

    if (website) {
      // Honeypot filled: almost certainly a bot. Look successful, send nothing (and don't count it).
      sendingRef.current = false;
      setStatus("sent");
      return;
    }
    track("contact_submit", { topic });

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          email: email.trim(),
          topic,
          message: message.trim(),
          page: includePage && page ? page : undefined,
        }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; id?: number; error?: string } | null;
      if (res.ok && data?.ok) {
        setSentId(typeof data.id === "number" ? data.id : null);
        setStatus("sent");
      } else {
        setServerError(data?.error ?? `Our server couldn’t accept the message (error ${res.status}).`);
        setStatus("error");
      }
    } catch {
      setServerError("We couldn’t reach our server. Please check your internet connection and try again.");
      setStatus("error");
    } finally {
      sendingRef.current = false;
    }
  };

  const mailtoHref = `mailto:${SITE.contactEmail}?subject=${encodeURIComponent(`${topicLabel} — Sundial Years`)}&body=${encodeURIComponent(
    `${message.trim().slice(0, 1500)}${page && includePage ? `\n\n(Page: ${SITE.url}${page})` : ""}`,
  )}`;

  if (status === "sent") {
    return (
      <div role="status" aria-live="polite" className="pop">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-sage-wash text-sage">
          <Icon name="check" size={24} strokeWidth={2.2} />
        </span>
        <h2 ref={successRef} tabIndex={-1} className="mt-4 text-[1.75rem] font-semibold leading-tight outline-none">
          Thank you — your message reached us.
        </h2>
        <p className="mt-3 text-[1.125rem] leading-relaxed text-ink-2">
          <strong className="text-ink">{REPLY_PROMISE}</strong>, by email, to the address you gave
          {email.trim() ? (
            <>
              {" "}
              (<span className="font-semibold text-ink">{email.trim()}</span>)
            </>
          ) : null}
          . If you don’t see our answer, please check your spam or junk folder.
        </p>
        {sentId != null ? <p className="mt-2 text-[1rem] text-ink-3">Reference number: #{sentId}</p> : null}
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setMessage("");
              setTouched({});
              setAttempted(false);
              setSentId(null);
              setStatus("idle");
            }}
          >
            Send another message
          </button>
          <Link href="/" className="btn btn-quiet">
            Back to the calculators
          </Link>
        </div>
      </div>
    );
  }

  const describedBy = (f: Field, hintId?: string) => [hintId, show(f) ? `${ids[f]}-err` : null].filter(Boolean).join(" ") || undefined;
  const sending = status === "sending";

  return (
    <form
      noValidate
      aria-label="Contact form"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="space-y-6"
    >
      <div>
        <label htmlFor={ids.name} className="field-label">
          Your name <span className="font-normal text-ink-3">(optional)</span>
        </label>
        <input
          ref={nameRef}
          id={ids.name}
          name="name"
          autoComplete="name"
          className="input"
          value={name}
          maxLength={CONTACT_LIMITS.nameMax + 20}
          aria-invalid={show("name") ? true : undefined}
          aria-describedby={describedBy("name")}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, name: true }))}
        />
        {show("name") ? (
          <p id={`${ids.name}-err`} className="field-hint !text-ember">
            {show("name")}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor={ids.email} className="field-label">
          Your email address
        </label>
        <input
          ref={emailRef}
          id={ids.email}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          className="input"
          value={email}
          aria-invalid={show("email") ? true : undefined}
          aria-describedby={describedBy("email", `${ids.email}-hint`)}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
        />
        <p id={`${ids.email}-hint`} className="field-hint">
          We use it only to answer you. No newsletter, no mailing list.
        </p>
        {show("email") ? (
          <p id={`${ids.email}-err`} className="field-hint !text-ember">
            <Icon name="warn" size={15} className="mr-1 inline-block align-[-2px]" />
            {show("email")}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor={ids.topic} className="field-label">
          What is it about?
        </label>
        <select
          id={ids.topic}
          name="topic"
          className="input"
          value={topic}
          onChange={(e) => {
            const v = e.target.value;
            if (isContactTopic(v)) setTopicEdit(v);
          }}
        >
          {CONTACT_TOPICS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        {topic === "number-looks-wrong" ? (
          <p className="field-hint">
            Thank you — this is the most useful message we get. Tell us the page, the number you see and what you expected. A link to the
            official SSA, CMS or IRS page helps us fix it fastest. For a calculator result, paste the link from{" "}
            <strong className="text-ink-2">“Copy link to my results”</strong> so we can see exactly what you saw.
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor={ids.message} className="field-label">
          Your message
        </label>
        <textarea
          ref={messageRef}
          id={ids.message}
          name="message"
          rows={7}
          required
          className="input min-h-[11rem] resize-y py-3 leading-relaxed"
          value={message}
          placeholder={PLACEHOLDER[topic]}
          aria-invalid={show("message") ? true : undefined}
          aria-describedby={describedBy("message", `${ids.message}-hint`)}
          onChange={(e) => setMessage(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, message: true }))}
        />
        <p id={`${ids.message}-hint`} className="field-hint flex flex-wrap justify-between gap-2">
          <span>Please don’t include your Social Security number, Medicare number or account numbers — we never need them.</span>
          <span className="num shrink-0" aria-hidden={message.length < CONTACT_LIMITS.messageMax * 0.8 ? true : undefined}>
            {message.length.toLocaleString("en-US")} / {CONTACT_LIMITS.messageMax.toLocaleString("en-US")}
          </span>
        </p>
        {show("message") ? (
          <p id={`${ids.message}-err`} className="field-hint !text-ember">
            <Icon name="warn" size={15} className="mr-1 inline-block align-[-2px]" />
            {show("message")}
          </p>
        ) : null}
      </div>

      {page ? (
        <label htmlFor={ids.includePage} className="sunk flex min-h-[3.25rem] cursor-pointer items-start gap-3 p-4 text-[1rem] text-ink-2">
          <input
            id={ids.includePage}
            type="checkbox"
            className="mt-1 h-5 w-5 shrink-0 accent-[var(--sun)]"
            checked={includePage}
            onChange={(e) => setIncludePage(e.target.checked)}
          />
          <span>
            Include the page you came from so we can find it: <span className="font-semibold text-ink">{page}</span>
          </span>
        </label>
      ) : null}

      {/* Honeypot — invisible to people and assistive tech. Bots that fill every field give themselves away.
          Its name/label deliberately avoid words like "website" or "url" that browser autofill and password managers
          match on (a real person's autofilled honeypot would otherwise be silently dropped), and the data-* attributes
          tell 1Password, LastPass, Bitwarden and Dashlane to leave it alone. */}
      <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
        <label htmlFor={ids.honeypot}>Leave this box empty</label>
        <input
          id={ids.honeypot}
          name="sy_hp"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          data-1p-ignore=""
          data-lpignore="true"
          data-bwignore=""
          data-form-type="other"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      {status === "error" ? (
        <div role="alert" className="flex gap-3 rounded-[var(--r-lg)] bg-ember-wash p-4">
          <Icon name="warn" size={21} className="mt-0.5 shrink-0 text-ember" />
          <div className="text-[1rem] leading-relaxed text-ink-2">
            <p className="font-bold text-ember">Your message was not sent.</p>
            <p className="mt-1">{serverError}</p>
            <p className="mt-1">Your text is still here. Try again, or send it by email instead.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="btn btn-primary" onClick={() => void submit()}>
                Try again
              </button>
              <a className="btn btn-ghost" href={mailtoHref}>
                <Icon name="mail" size={19} /> Email it to {SITE.contactEmail}
              </a>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button type="submit" className="btn btn-primary sm:min-w-[13rem]" disabled={sending} aria-disabled={sending || undefined}>
          {sending ? (
            "Sending…"
          ) : (
            <>
              Send message <Icon name="arrow" size={19} />
            </>
          )}
        </button>
        <p className="text-[0.9375rem] leading-snug text-ink-3">{REPLY_PROMISE}.</p>
      </div>
      <p className="field-hint !mt-3">
        What you send is stored in our database and emailed to us. Our analytics tool also records text submitted through forms. Details in
        our{" "}
        <Link href="/privacy" className="link">
          privacy policy
        </Link>
        .
      </p>
    </form>
  );
}
