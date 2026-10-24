import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CATEGORIES, getCategory, getPostsByCategory, pageCount, paginationParams } from "@/lib/blog";
import { CategoryHub, categoryMetadata } from "../../../_components/CategoryHub";

/** Parse "/page/<n>": only 2…last exist (page 1 is the hub itself, so /page/1 is never linked and 404s). */
function pageNumber(category: string, n: string) {
  if (!/^[1-9]\d*$/.test(n)) return null;
  const page = Number(n);
  const total = pageCount(getPostsByCategory(category).length);
  return page >= 2 && page <= total ? page : null;
}

/**
 * Only listing pages that exist (12 guides per page). `ensureStatic = "navigation"` needs at least one entry, so while
 * no category has a second page we prerender a single placeholder that resolves to the 404 page.
 */
export function generateStaticParams() {
  const real = paginationParams();
  return real.length ? real : [{ category: CATEGORIES[0].slug, n: "1" }];
}

export async function generateMetadata({ params }: PageProps<"/blog/[category]/page/[n]">): Promise<Metadata> {
  const { category, n } = await params;
  const cat = getCategory(category);
  const page = cat ? pageNumber(cat.slug, n) : null;
  return cat && page ? categoryMetadata(cat, page) : {};
}

export default async function CategoryListingPage({ params }: PageProps<"/blog/[category]/page/[n]">) {
  const { category, n } = await params;
  const cat = getCategory(category);
  const page = cat ? pageNumber(cat.slug, n) : null;
  if (!cat || !page) notFound();
  return <CategoryHub category={cat} page={page} />;
}
