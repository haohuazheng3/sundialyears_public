import type { Metadata } from "next";
import { SITE, absoluteUrl } from "./site";

export function pageMetadata({
  title,
  description,
  path,
  ogType = "website",
  noindex = false,
  publishedTime,
  modifiedTime,
}: {
  title: string;
  description: string;
  path: string;
  ogType?: "website" | "article";
  noindex?: boolean;
  publishedTime?: string;
  modifiedTime?: string;
}): Metadata {
  const url = absoluteUrl(path);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: ogType,
      url,
      title,
      description,
      siteName: SITE.name,
      locale: SITE.locale,
      ...(ogType === "article" ? { publishedTime, modifiedTime } : {}),
    },
    twitter: { card: "summary_large_image", title, description },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

export const ORG_ID = `${SITE.url}/#organization`;
export const WEBSITE_ID = `${SITE.url}/#website`;

export function organizationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    name: SITE.name,
    url: SITE.url,
    logo: { "@type": "ImageObject", url: absoluteUrl("/brand/logo-512.png"), width: 512, height: 512 },
    email: SITE.contactEmail,
    foundingDate: String(SITE.foundingYear),
    description: SITE.description,
    contactPoint: [{ "@type": "ContactPoint", contactType: "customer support", email: SITE.contactEmail, availableLanguage: ["English"] }],
    sameAs: [] as string[],
  };
}

export function websiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: SITE.url,
    name: SITE.name,
    description: SITE.description,
    publisher: { "@id": ORG_ID },
    inLanguage: "en-US",
  };
}

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: absoluteUrl(it.path) })),
  };
}

export function calculatorLd({ name, description, path }: { name: string; description: string; path: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name,
    description,
    url: absoluteUrl(path),
    applicationCategory: "FinanceApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    publisher: { "@id": ORG_ID },
    inLanguage: "en-US",
  };
}

export function faqLd(faqs: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}

export function articleLd({
  headline,
  description,
  path,
  datePublished,
  dateModified,
  image,
}: {
  headline: string;
  description: string;
  path: string;
  datePublished: string;
  dateModified: string;
  image?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    description,
    mainEntityOfPage: absoluteUrl(path),
    datePublished,
    dateModified,
    author: { "@type": "Organization", "@id": ORG_ID, name: SITE.name, url: SITE.url },
    publisher: { "@id": ORG_ID },
    ...(image ? { image: [absoluteUrl(image)] } : {}),
    inLanguage: "en-US",
  };
}

export function datasetLd({ name, description, path, dateModified, sources }: { name: string; description: string; path: string; dateModified: string; sources: string[] }) {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name,
    description,
    url: absoluteUrl(path),
    dateModified,
    creator: { "@id": ORG_ID },
    isBasedOn: sources,
    license: "https://creativecommons.org/licenses/by/4.0/",
    isAccessibleForFree: true,
  };
}
