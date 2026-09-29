// Metro config for the monorepo (#18). The app lives in apps/mobile but the
// quiz logic it shares with the web app lives in ../../src, so Metro has to
// watch the repository root or it silently fails to resolve those files and the
// bundle 404s at import time rather than erroring usefully.
//
// Two settings, and they are both load-bearing. Getting either wrong fails at
// runtime on a device, not at build time, which is why they are spelled out.
//
// 1. `nodeModulesPaths` — the resolution order. Metro checks these in order for
// every bare import, so apps/mobile/node_modules wins and the shared files at
// the repo root get the *app's* copy of react rather than the web's 19.3.
//
// 2. `disableHierarchicalLookup` — this is the one that actually bites. Left
//    off, a file living outside apps/mobile (anything under ../../src, plus
//    generated files at the root) resolves by walking up from its own
//    directory, so it finds the ROOT node_modules while a file in apps/mobile
//    finds the local one. Both copies of `convex` then end up in the bundle.
//
//    Two copies of `convex/react` means two separate React contexts, so
//    `ConvexAuthProvider` publishes a context the app's `useConvexAuth` hook
//    cannot see. The app does not crash on the web, where the bundler
//    deduplicates, and it does not crash on a simulator with a dev server. On
//    a release build it dies at first render with:
//
//      Could not find `ConvexProviderWithAuth` ... you might have two
//      instances of the `convex/react` module loaded in your project
//
//    Turning hierarchical lookup off makes nodeModulesPaths the only mechanism,
//    so every file in the bundle resolves through the same list in the same
//    order and there is exactly one `convex`.
//
// The versions are still pinned to match the root (convex, zod,
// @convex-dev/auth) so the single instance both sides see is the same build.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
