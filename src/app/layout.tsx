import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Instrument_Serif } from "next/font/google";

import { AmbientBackground } from "@/components/AmbientBackground";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { OutboxFlusher } from "@/components/SyncStatus";
import { ServiceWorker } from "@/components/ServiceWorker";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-sans",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-instrument",
  display: "swap",
});

/** Dev-only branding (#28): automatic via NODE_ENV, zero prod effect. */
const isDev = process.env.NODE_ENV === "development";

export const metadata: Metadata = {
  title: isDev ? "[dev] 👷 Endless AI" : "Endless AI",
  description:
    "An endless general knowledge quiz about AI. Four options, no timer, keep going until you quit.",
  icons: {
    icon: [{ url: isDev ? "/icon-dev.svg" : "/icon.svg", type: "image/svg+xml" }],
    apple: "/icons/apple-touch-icon.png",
  },
  // iOS has no install prompt and no install API. These tags are the whole
  // install path there, and they only take effect once the app has been added
  // to the home screen, so browser mode pays nothing for them.
  appleWebApp: {
    capable: true,
    title: "Endless AI",
    // A dark room with one bright accent: black bars, light text.
    statusBarStyle: "black-translucent",
  },
  // Next emits only the standard `mobile-web-app-capable` for `capable` above
  // (PR vercel/next.js#70363 replaced Apple's tag with it because Chrome warns
  // about the old one), and dropped it in a release where splash images on
  // iPhone stopped working for people relying on it (vercel/next.js#74524,
  // closed as not planned). iOS standalone mode comes from the manifest's
  // `display`, but the launch image and `navigator.standalone` still want the
  // Apple spelling, and iOS is the one platform we cannot verify from here.
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0b0d",
  // Lets the background bleed under the notch and the home indicator once
  // installed. `frame-t/x/b` in globals.css pads the content back in.
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
      <html lang="en" suppressHydrationWarning className={`${plexSans.variable} ${plexMono.variable} ${instrument.variable}`}>
      <body className="min-h-dvh antialiased">
        <AmbientBackground />
        <div className="relative z-2">
          {/* The flusher reads auth state and sends mutations, so it lives
              inside the provider, not next to it. */}
          <ConvexClientProvider>
            {children}
            <OutboxFlusher />
          </ConvexClientProvider>
        </div>
        <ServiceWorker />
      </body>
    </html>
  );
}
