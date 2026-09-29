// Metro config for the monorepo (#18). The app lives in apps/mobile but the
// quiz logic it shares with the web app lives in ../../src/lib, so Metro has to
// watch the repository root or it silently fails to resolve those files and the
// bundle 404s at import time rather than erroring usefully.
//
// Why nodeModulesPaths and not just watchFolders: hierarchical lookup walks up
// from each importing file, so a shared lib at /src/lib would find the *web*
// app's node_modules — including react 19.3 and react-dom — and Metro would
// happily bundle the web build of React into a native app. Listing the roots
// explicitly makes the resolution order ours to reason about.
//
// The one thing to watch: apps/mobile pins the same versions as the root for
// anything both sides import (convex, zod, react). Two copies of convex in one
// bundle produces a client that authenticates against one deployment and a
// generated API that points at another, which fails as a confusing runtime
// error rather than a build error. `npm run doctor` in apps/mobile exists to
// catch that drift before a device does.
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

module.exports = config;
