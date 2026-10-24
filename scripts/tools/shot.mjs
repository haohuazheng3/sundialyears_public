// Usage: node scripts/tools/shot.mjs <url> <outPrefix> [--dark]
import { chromium } from "@playwright/test";
const [url, out, flag] = process.argv.slice(2);
const b = await chromium.launch();
for (const [name, vp, mobile] of [["desktop", { width: 1366, height: 900 }, false], ["mobile", { width: 390, height: 844 }, true]]) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile, colorScheme: flag === "--dark" ? "dark" : "light" });
  const p = await ctx.newPage();
  const errors = [];
  p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  p.on("pageerror", (e) => errors.push(String(e)));
  await p.goto(url, { waitUntil: "networkidle" });
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${out}-${name}.png`, fullPage: process.env.FULL === "1" });
  console.log(name, "errors:", errors.length ? errors.slice(0, 5) : "none");
  await ctx.close();
}
await b.close();
