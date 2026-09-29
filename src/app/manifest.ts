import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  // Dev-only branding (#28): a dev install reads as dev. Prod untouched.
  const isDev = process.env.NODE_ENV === "development";
  return {
    name: isDev ? "[dev] Endless AI" : "Endless AI",
    short_name: isDev ? "[dev] AI" : "Endless AI",
    description:
      "An endless general knowledge quiz about AI. Four options, no timer, keep going until you quit.",
    // Pins the install identity. Without an `id` the browser derives one from
    // `start_url`, so a later change to that path silently installs a second
    // copy of the app next to the first.
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    // One question at a time, thumb-reachable. The quiz never uses the width.
    orientation: "portrait",
    categories: ["games", "education"],
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
    // Long-press the home screen icon. Both routes are real pages, so this is
    // navigation, not a separate code path to keep alive.
    shortcuts: [
      {
        name: "Categories",
        short_name: "Cats",
        url: "/categories",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Your profile",
        short_name: "Profile",
        url: "/profile",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
