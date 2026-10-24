import "server-only";

/**
 * Owner notifications through the sundialyears-mail Cloudflare Worker (send_email binding → verified owner inbox).
 * Returns false (and logs) when not configured or delivery fails; callers decide whether that is an error.
 */
export async function notifyOwner(subject: string, text: string, replyTo?: string): Promise<boolean> {
  const url = process.env.NOTIFY_WORKER_URL;
  const secret = process.env.NOTIFY_SECRET;
  if (!url || !secret) {
    console.error("[notify] NOTIFY_WORKER_URL / NOTIFY_SECRET not configured");
    return false;
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${secret}` },
      body: JSON.stringify({ subject: `[Sundial Years] ${subject}`, text, replyTo }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error(`[notify] worker responded ${res.status}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[notify] delivery failed", e);
    return false;
  }
}
