import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.name,
    short_name: SITE.shortName,
    description: SITE.description,
    start_url: "/",
    display: "standalone",
    background_color: "#f4f1ea",
    theme_color: "#f4f1ea",
    icons: [
      { src: "/brand/logo-256.png", sizes: "256x256", type: "image/png" },
      { src: "/brand/logo-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
