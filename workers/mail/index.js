// sundialyears-mail — Cloudflare Worker (no mail provider needed)
//  • email(): mail to test@sundialyears.com is posted to the app's protected ingest endpoint
//    together with its Authentication-Results / DKIM headers (delivery proof).
//  • fetch(): POST / with "Authorization: Bearer <NOTIFY_SECRET>" sends a plain-text email to the
//    verified owner address through Email Routing's send_email binding (contact form, error alerts).
import { EmailMessage } from "cloudflare:email";

function header(v) {
  const clean = String(v ?? "").replace(/[\r\n]+/g, " ").slice(0, 300);
  return /^[\x20-\x7e]*$/.test(clean) ? clean : `=?UTF-8?B?${btoa(String.fromCharCode(...new TextEncoder().encode(clean)))}?=`;
}
function b64Body(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/.{1,76}/g, "$&\r\n");
}
async function readRaw(stream, max) {
  const reader = stream.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (size < max) chunks.push(value.slice(0, max - size));
    size += value.length;
  }
  const out = new Uint8Array(Math.min(size, max));
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return new TextDecoder().decode(out);
}

const worker = {
  async email(message, env) {
    const raw = await readRaw(message.raw, 262144);
    const headers = {};
    for (const [k, v] of message.headers) headers[k] = v;
    const res = await fetch(`${env.APP_URL}/api/inbox/ingest`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${env.INBOX_INGEST_SECRET}` },
      body: JSON.stringify({ to: message.to, from: message.from, headers, raw }),
    });
    if (!res.ok) {
      // Surface the failure to the sender's MTA instead of silently dropping the message.
      message.setReject(`ingest failed: ${res.status}`);
    }
  },

  async fetch(req, env) {
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
    const auth = req.headers.get("authorization") || "";
    if (!env.NOTIFY_SECRET || auth !== `Bearer ${env.NOTIFY_SECRET}`) return new Response("Unauthorized", { status: 401 });
    let body;
    try { body = await req.json(); } catch { return new Response("Bad JSON", { status: 400 }); }
    const subject = header(body.subject || "Sundial Years notification");
    const text = String(body.text || "").slice(0, 20000);
    const replyTo = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(body.replyTo || "") ? body.replyTo : null;
    const domain = env.FROM_ADDRESS.split("@")[1];
    // body.to === "test" sends to the test inbox (delivery/authentication self-check); default is the owner.
    const toTest = body.to === "test" && env.TEST && env.TEST_ADDRESS;
    const toAddr = toTest ? env.TEST_ADDRESS : env.OWNER_ADDRESS;
    const raw = [
      `From: ${header(env.FROM_NAME || "Sundial Years")} <${env.FROM_ADDRESS}>`,
      `To: <${toAddr}>`,
      `Subject: ${subject}`,
      replyTo ? `Reply-To: <${replyTo}>` : null,
      `Message-ID: <${crypto.randomUUID()}@${domain}>`,
      `Date: ${new Date().toUTCString()}`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=utf-8",
      "Content-Transfer-Encoding: base64",
      "",
      b64Body(text),
    ].filter((l) => l !== null).join("\r\n");
    try {
      await (toTest ? env.TEST : env.OWNER).send(new EmailMessage(env.FROM_ADDRESS, toAddr, raw));
      return Response.json({ ok: true });
    } catch (e) {
      return Response.json({ ok: false, error: String(e && e.message ? e.message : e) }, { status: 502 });
    }
  },
};

export default worker;
