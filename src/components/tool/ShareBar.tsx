"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { track } from "@/lib/analytics";

/** Copy a link to these exact results, print / save as PDF, or email it to a spouse or advisor. */
export function ShareBar({ tool, subject }: { tool: string; subject: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="no-print flex flex-wrap gap-2">
      <button
        type="button"
        className="btn btn-ghost"
        onClick={async () => {
          setCopied(true);
          track("share_copy_link", { tool });
          try {
            await navigator.clipboard.writeText(window.location.href);
          } catch {
            window.prompt("Copy this link:", window.location.href);
          }
          setTimeout(() => setCopied(false), 2200);
        }}
      >
        <Icon name={copied ? "check" : "link"} size={19} />
        {copied ? "Link copied" : "Copy link to my results"}
      </button>
      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => {
          track("share_print", { tool });
          window.print();
        }}
      >
        <Icon name="print" size={19} /> Print or save PDF
      </button>
      <a
        className="btn btn-ghost"
        href="#"
        onClick={(e) => {
          e.preventDefault();
          track("share_email", { tool });
          window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`Here are the numbers I ran:\n\n${window.location.href}\n`)}`;
        }}
      >
        <Icon name="mail" size={19} /> Email these results
      </a>
    </div>
  );
}
