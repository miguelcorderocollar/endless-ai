import type { NextConfig } from "next";

import { writeBankBundle } from "./src/lib/questions/bankBundle";

// The offline fallback bank (#17): a stable-URL snapshot of the validated
// content, regenerated on every build and dev boot so the service worker can
// precache it by name. Cheap (a directory read plus JSON parses), so there is
// no flag and no manual step — `public/bank.json` is gitignored. A failure
// here must not fail the build: the app runs fine without a fallback bank,
// and `npm run validate` is the place that gates content problems.
try {
  const { count } = writeBankBundle(__dirname);
  console.log(`Bundled ${count} questions into public/bank.json (offline fallback).`);
} catch (error) {
  console.warn(
    "Skipping the offline fallback bank: " +
      (error instanceof Error ? error.message : String(error)),
  );
}

const nextConfig: NextConfig = {
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
