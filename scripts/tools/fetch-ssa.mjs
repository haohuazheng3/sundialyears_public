// Fetches SSA OACT files that block plain curl (Akamai) by using a real Chromium page context.
// Usage: node scripts/tools/fetch-ssa.mjs <outDir> <url> [url...]
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
const [outDir, ...urls] = process.argv.slice(2);
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  locale: "en-US",
});
const page = await ctx.newPage();
await page.goto("https://www.ssa.gov/oact/", { waitUntil: "domcontentloaded" });
for (const u of urls) {
  const res = await page.evaluate(async (url) => {
    const r = await fetch(url);
    const buf = new Uint8Array(await r.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return { status: r.status, b64: btoa(bin) };
  }, u);
  const f = path.join(outDir, path.basename(new URL(u).pathname));
  const data = Buffer.from(res.b64, "base64");
  fs.writeFileSync(f, data);
  console.log(res.status, f, data.length);
}
await browser.close();
