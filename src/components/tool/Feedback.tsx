"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/analytics";

/** "Did this answer your question?" — flips instantly, sends in the background. */
export function Feedback() {
  const page = usePathname() ?? "/";
  const [vote, setVote] = useState<null | boolean>(null);
  const [comment, setComment] = useState("");
  const [sent, setSent] = useState<"idle" | "sending" | "done" | "error">("idle");

  const send = async (helpful: boolean, text?: string) => {
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ page, helpful, comment: text || undefined }),
      });
      if (!res.ok) throw new Error(String(res.status));
      return true;
    } catch {
      return false;
    }
  };

  return (
    <section aria-label="Feedback" className="float-soft no-print flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
      {vote === null ? (
        <>
          <p className="text-[1.0625rem] font-bold text-ink">Did this answer your question?</p>
          <div className="flex gap-2">
            {[true, false].map((v) => (
              <button
                key={String(v)}
                type="button"
                className="btn btn-ghost min-w-[6.5rem]"
                onClick={() => {
                  setVote(v);
                  track("feedback_vote", { page, helpful: v });
                  void send(v);
                }}
              >
                {v ? "Yes" : "Not quite"}
              </button>
            ))}
          </div>
        </>
      ) : sent === "done" ? (
        <p className="text-[1.0625rem] text-ink-2">Thank you — we read every note.</p>
      ) : (
        <form
          className="flex w-full flex-col gap-3 sm:flex-row sm:items-center"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!comment.trim()) {
              setSent("done");
              return;
            }
            setSent("sending");
            const ok = await send(vote, comment.trim());
            setSent(ok ? "done" : "error");
          }}
        >
          <label htmlFor="fb-comment" className="shrink-0 font-bold text-ink">
            {vote ? "Glad it helped. Anything missing?" : "What were you looking for?"}
          </label>
          <input
            id="fb-comment"
            className="input min-h-12 flex-1 !text-[1rem]"
            value={comment}
            maxLength={1000}
            placeholder="Optional"
            onChange={(e) => setComment(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={sent === "sending"}>
            {sent === "sending" ? "Sending…" : "Send"}
          </button>
          {sent === "error" ? <p className="text-ember" role="alert">Couldn’t send — please try again.</p> : null}
        </form>
      )}
    </section>
  );
}
