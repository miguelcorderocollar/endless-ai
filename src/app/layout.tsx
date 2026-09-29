import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Instrument_Serif } from "next/font/google";

import { AmbientBackground } from "@/components/AmbientBackground";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
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
  // iOS has no install prompt and no install API. These three tags are the
  // entire install path there, and they only take effect once the app has been
  // added to the home screen, so browser mode pays nothing for them.
  appleWebApp: {
    capable: true,
    title: "Endless AI",
    // A dark room with one bright accent: black bars, light text.
    statusBarStyle: "black-translucent",
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
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </div>
        <ServiceWorker />
      </body>
    </html>
  );
}
