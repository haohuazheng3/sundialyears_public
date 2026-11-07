/**
 * Local Pexels photos in Markdown (`![alt](/images/seo/<file>.webp)`) → sized, lazy figures with the photo credit.
 * Size and credit come from content/seo/_images.json (written by scripts/seo/pexels.mjs). Build-time only.
 */
import fs from "node:fs";
import path from "node:path";

export interface ImageMeta {
  width: number;
  height: number;
  photographer: string;
  photographerUrl: string;
  pexelsUrl: string;
}

const IMAGES_FILE = path.join(process.cwd(), "content", "seo", "_images.json");
let cache: Record<string, ImageMeta> | null = null;
export function imageMeta(): Record<string, ImageMeta> {
  if (!cache) cache = fs.existsSync(IMAGES_FILE) ? (JSON.parse(fs.readFileSync(IMAGES_FILE, "utf8")) as Record<string, ImageMeta>) : {};
  return cache;
}

const escapeAttr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Replaces `<p><img …></p>` for /images/seo/ photos; other images are left alone. Pushes each used path to `used`. */
export function figures(html: string, file: string, used: string[] = []) {
  return html.replace(/<p><img src="(\/images\/seo\/[^"]+)" alt="([^"]*)"[^>]*\/?><\/p>/g, (_, src: string, alt: string) => {
    const meta = imageMeta()[src];
    if (!meta) throw new Error(`${file}: image ${src} has no entry in content/seo/_images.json`);
    if (!fs.existsSync(path.join(process.cwd(), "public", src))) throw new Error(`${file}: image ${src} is missing from public/`);
    used.push(src);
    return (
      `<figure class="my-8"><img src="${src}" alt="${alt}" width="${meta.width}" height="${meta.height}" loading="lazy" decoding="async" class="h-auto w-full rounded-[var(--r-lg)]" />` +
      `<figcaption class="mt-2 text-[0.85rem] text-ink-3">Photo: <a href="${escapeAttr(meta.pexelsUrl)}" rel="noopener nofollow">${escapeAttr(meta.photographer)} / Pexels</a></figcaption></figure>`
    );
  });
}
