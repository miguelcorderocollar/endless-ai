import { ConvexReactClient } from "convex/react";

/**
 * The Convex deployment this build talks to.
 *
 * `EXPO_PUBLIC_*` is inlined by Metro at bundle time, so the URL is baked into
 * the APK — this is not a runtime setting and there is no way to repoint a
 * shipped build without shipping a new one. That makes the value below the
 * single most consequential line in the app: a Play build pointed at the dev
 * deployment (`careful-salmon-552`) would be a public app reading and writing
 * dev data, and dev data is disposable.
 *
 * So: dev builds get the URL from the environment, and anything that is not
 * obviously a production host fails loudly in development rather than quietly
 * in the Play Store. See `docs/deployment.md` for the deployment names.
 */
const url = process.env.EXPO_PUBLIC_CONVEX_URL;

const DEV_DEPLOYMENT_HOST = /\.convex\.cloud$/;

export function backendUrl(): string | null {
  return url && url.length > 0 ? url : null;
}

/**
 * Warns when a non-dev build carries a dev deployment. `__DEV__` is React
 * Native's flag, false in any release bundle — which is exactly the build that
 * must never carry a dev URL.
 */
export function assertDeployable(): void {
  if (!url) return;
  if (!__DEV__ && DEV_DEPLOYMENT_HOST.test(url)) {
    console.error(
      "[backend] EXPO_PUBLIC_CONVEX_URL points at a dev deployment in a release " +
        `build (${url}). Do not ship this APK.`,
    );
  }
}

let client: ConvexReactClient | null = null;

export function convexClient(): ConvexReactClient | null {
  const target = backendUrl();
  if (!target) return null;
  if (!client) client = new ConvexReactClient(target);
  return client;
}
