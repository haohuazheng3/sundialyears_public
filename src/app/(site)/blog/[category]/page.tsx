import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { categoryParams, getCategory } from "@/lib/blog";
import { CategoryHub, categoryMetadata } from "../_components/CategoryHub";

/** One hub per topic (/blog/social-security …) — always prerendered, even before its first guide is published. */
export function generateStaticParams() {
  return categoryParams();
}

export async function generateMetadata({ params }: PageProps<"/blog/[category]">): Promise<Metadata> {
  const { category } = await params;
  const cat = getCategory(category);
  return cat ? categoryMetadata(cat, 1) : {};
}

export default async function CategoryPage({ params }: PageProps<"/blog/[category]">) {
  const { category } = await params;
  const cat = getCategory(category);
  if (!cat) notFound();
  return <CategoryHub category={cat} page={1} />;
}
