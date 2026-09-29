import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  // Dev-only branding (#28): a dev install reads as dev. Prod untouched.
  const isDev = process.env.NODE_ENV === "development";
  return {
    name: isDev ? "[dev] Endless AI" : "Endless AI",
    short_name: isDev ? "[dev] AI" : "Endless AI",
    description:
      "An endless general knowledge quiz about AI. Four options, no timer, keep going until you quit.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0b0d",
    theme_color: "#0a0b0d",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
