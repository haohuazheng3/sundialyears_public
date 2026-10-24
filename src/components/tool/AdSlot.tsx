"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * AdSense unit. Renders nothing until NEXT_PUBLIC_ADSENSE_CLIENT (ca-pub-…) and a slot id are configured,
 * so there is no empty box and no layout shift before ads are approved.
 */
export function AdSlot({ slot, format = "auto", className = "" }: { slot?: string; format?: "auto" | "fluid" | "rectangle"; className?: string }) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const ref = useRef<HTMLModElement>(null);
  const slotId = slot ?? process.env.NEXT_PUBLIC_ADSENSE_DEFAULT_SLOT;
  useEffect(() => {
    if (!client || !slotId) return;
    try {
      if (!document.querySelector('script[data-sy-adsense]')) {
        const s = document.createElement("script");
        s.async = true;
        s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
        s.crossOrigin = "anonymous";
        s.dataset.syAdsense = "1";
        document.head.appendChild(s);
      }
      // Non-personalized ads when the visitor chose "Essential only" or sends Global Privacy Control.
      let consent = "";
      try {
        consent = localStorage.getItem("sy_consent_v1") ?? "";
      } catch {
        /* storage blocked */
      }
      const gpc = (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
      const ads = (window.adsbygoogle = window.adsbygoogle || []) as unknown[] & { requestNonPersonalizedAds?: number };
      if (gpc || consent.includes('"essential"') || consent === "") ads.requestNonPersonalizedAds = 1;
      ads.push({});
    } catch {
      /* ad blockers etc. — the page must work without ads */
    }
  }, [client, slotId]);
  if (!client || !slotId) return null;
  return (
    <div data-ad-slot className={`no-print mx-auto my-8 min-h-[280px] max-w-[1180px] px-4 ${className}`} aria-label="Advertisement">
      <p className="mb-2 text-center text-[0.75rem] uppercase tracking-[0.14em] text-ink-3">Advertisement</p>
      <ins
        ref={ref}
        className="adsbygoogle block"
        data-ad-client={client}
        data-ad-slot={slotId}
        data-ad-format={format}
        data-full-width-responsive="true"
        // Page URL without query/fragment so calculator inputs are never sent with ad requests.
        data-page-url={typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}` : undefined}
      />
    </div>
  );
}
