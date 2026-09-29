import type { NextConfig } from "next";

import { writeBankBundle } from "./src/lib/questions/bankBundle";

// The offline fallback bank (#17): a stable-URL snapshot of the validated
// content, regenerated on every build and dev boot so the service worker can
// precache it by name. Cheap (a directory read plus JSON parses), so there is
// no flag and no manual step — `public/bank.json` is gitignored.
const { count } = writeBankBundle(__dirname);
console.log(`Bundled ${count} questions into public/bank.json (offline fallback).`);

const nextConfig: NextConfig = {
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
