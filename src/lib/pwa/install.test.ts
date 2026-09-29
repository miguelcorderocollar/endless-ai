import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The install store's platform branches.
 *
 * In a browser these are driven by `matchMedia`, the user agent and an event
 * the browser may or may not fire. Chromium fires `beforeinstallprompt` on
 * localhost, iOS never does, and a headless run cannot be made to reproduce
 * either on demand. So the four branches are pinned here against stubbed
 * globals, and `e2e/pwa.spec.ts` covers the part that actually needs a browser:
 * that the affordance is wired to the store at all.
 */

type FakeWindow = {
  addEventListener: (type: string, listener: (event: Event) => void) => void;
  matchMedia: (query: string) => { matches: boolean; addEventListener: () => void };
  localStorage: {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
    removeItem: (key: string) => void;
  };
};

function stub(options: {
  standalone?: boolean;
  userAgent?: string;
  platform?: string;
  maxTouchPoints?: number;
  dismissed?: boolean;
}) {
  const storage = new Map<string, string>();
  if (options.dismissed) storage.set("endless-ai:install-dismissed:v1", "1");

  const win: FakeWindow = {
    addEventListener: (type, listener) => {
      listeners.set(type, listener);
    },
    matchMedia: (query) => ({
      matches: options.standalone === true && query.includes("standalone"),
      addEventListener: () => {},
    }),
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => void storage.set(key, value),
      removeItem: (key) => void storage.delete(key),
    },
  };

  Object.defineProperty(globalThis, "window", { value: win, configurable: true });
  Object.defineProperty(globalThis, "navigator", {
    value: {
      userAgent: options.userAgent ?? "Mozilla/5.0 (X11; Linux x86_64)",
      platform: options.platform ?? "Linux x86_64",
      maxTouchPoints: options.maxTouchPoints ?? 0,
      standalone: options.standalone === true,
    },
    configurable: true,
  });

  return {
    stored: () => storage.get("endless-ai:install-dismissed:v1"),
    fire: (type: string, event: Event) => listeners.get(type)?.(event),
    hasListener: (type: string) => listeners.has(type),
  };
}

const listeners = new Map<string, (event: Event) => void>();

/** Fresh module per test: the store keeps a `started` guard and cached state. */
async function load() {
  vi.resetModules();
  return import("@/lib/pwa/install");
}

beforeEach(() => {
  listeners.clear();
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("isIOS", () => {
  it("reads an iPhone from the user agent", async () => {
    stub({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)" });
    const { isIOS } = await load();
    expect(isIOS()).toBe(true);
  });

  it("reads a touch-enabled Mac as an iPad, which is what iPadOS reports", async () => {
    stub({ platform: "MacIntel", maxTouchPoints: 5 });
    const { isIOS } = await load();
    expect(isIOS()).toBe(true);
  });

  it("leaves a desktop alone", async () => {
    stub({ platform: "Linux x86_64", maxTouchPoints: 0 });
    const { isIOS } = await load();
    expect(isIOS()).toBe(false);
  });
});

describe("startInstallListener", () => {
  it("offers instructions on iOS, where there is no install API", async () => {
    stub({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)" });
    const { getInstallSnapshot, startInstallListener } = await load();

    startInstallListener();

    expect(getInstallSnapshot()).toMatchObject({
      installed: false,
      canPrompt: false,
      needsIOSInstructions: true,
      needsManualInstructions: false,
    });
  });

  it("offers the browser menu on an Android phone with no prompt yet", async () => {
    stub({ userAgent: "Mozilla/5.0 (Linux; Android 15)", maxTouchPoints: 5 });
    const { getInstallSnapshot, startInstallListener } = await load();

    startInstallListener();

    expect(getInstallSnapshot()).toMatchObject({
      needsIOSInstructions: false,
      needsManualInstructions: true,
    });
  });

  it("offers nothing on a desktop, where the menu path is not worth teaching", async () => {
    stub({ maxTouchPoints: 0 });
    const { getInstallSnapshot, startInstallListener } = await load();

    startInstallListener();

    expect(getInstallSnapshot()).toMatchObject({
      needsIOSInstructions: false,
      needsManualInstructions: false,
    });
  });

  it("listsens for nothing at all once launched from the home screen", async () => {
    const harness = stub({ standalone: true });
    const { getInstallSnapshot, startInstallListener } = await load();

    startInstallListener();

    expect(getInstallSnapshot().installed).toBe(true);
    expect(harness.hasListener("beforeinstallprompt")).toBe(false);
  });

  it("restores a remembered refusal", async () => {
    stub({ dismissed: true });
    const { getInstallSnapshot, startInstallListener } = await load();

    startInstallListener();

    expect(getInstallSnapshot().dismissed).toBe(true);
  });

  it("is idempotent, so a remount does not stack listeners", async () => {
    stub({ maxTouchPoints: 5 });
    const { startInstallListener } = await load();

    startInstallListener();
    const once = listeners.size;
    startInstallListener();

    // `beforeinstallprompt` and `appinstalled`; the display-mode query has its
    // own subscription. A second call must add nothing.
    expect(once).toBe(2);
    expect(listeners.size).toBe(once);
  });
});

describe("beforeinstallprompt", () => {
  it("turns a prompt into the one button, and suppresses Chrome's own banner", async () => {
    const harness = stub({ maxTouchPoints: 5 });
    const { getInstallSnapshot, startInstallListener } = await load();
    startInstallListener();

    let defaultPrevented = false;
    const event = new Event("beforeinstallprompt", { cancelable: true });
    event.preventDefault = () => {
      defaultPrevented = true;
    };
    Object.assign(event, {
      prompt: () => Promise.resolve(),
      userChoice: Promise.resolve({ outcome: "accepted" as const }),
    });
    harness.fire("beforeinstallprompt", event);

    expect(defaultPrevented).toBe(true);
    expect(getInstallSnapshot()).toMatchObject({
      canPrompt: true,
      // The button replaces the instructions rather than stacking with them.
      needsManualInstructions: false,
    });
  });

  it("marks the app installed when the prompt is accepted", async () => {
    const harness = stub({ maxTouchPoints: 5 });
    const { getInstallSnapshot, promptInstall, startInstallListener } = await load();
    startInstallListener();

    harness.fire(
      "beforeinstallprompt",
      Object.assign(new Event("beforeinstallprompt"), {
        prompt: () => Promise.resolve(),
        userChoice: Promise.resolve({ outcome: "accepted" as const }),
      }),
    );

    await expect(promptInstall()).resolves.toBe(true);
    expect(getInstallSnapshot().installed).toBe(true);
  });

  it("reports that there was nothing to open when no prompt arrived", async () => {
    stub({ maxTouchPoints: 5 });
    const { promptInstall, startInstallListener } = await load();
    startInstallListener();

    await expect(promptInstall()).resolves.toBe(false);
  });

  it("installs on `appinstalled`", async () => {
    const harness = stub({ maxTouchPoints: 5 });
    const { getInstallSnapshot, startInstallListener } = await load();
    startInstallListener();

    harness.fire("appinstalled", new Event("appinstalled"));

    expect(getInstallSnapshot().installed).toBe(true);
    expect(getInstallSnapshot().canPrompt).toBe(false);
  });
});

describe("dismissInstall", () => {
  it("persists the refusal so it survives a reload", async () => {
    const harness = stub({ maxTouchPoints: 5 });
    const { dismissInstall, getInstallSnapshot, startInstallListener } = await load();
    startInstallListener();

    dismissInstall();

    expect(getInstallSnapshot().dismissed).toBe(true);
    expect(harness.stored()).toBe("1");

    const reloaded = await load();
    reloaded.startInstallListener();
    expect(reloaded.getInstallSnapshot().dismissed).toBe(true);
  });

  it("can be undone", async () => {
    const harness = stub({ maxTouchPoints: 5, dismissed: true });
    const { getInstallSnapshot, resetInstallDismissal, startInstallListener } =
      await load();
    startInstallListener();

    resetInstallDismissal();

    expect(getInstallSnapshot().dismissed).toBe(false);
    expect(harness.stored()).toBeUndefined();
  });
});

describe("useSyncExternalStore contract", () => {
  it("keeps the same object identity until something changes", async () => {
    stub({ maxTouchPoints: 5 });
    const { getInstallSnapshot, startInstallListener } = await load();

    const before = getInstallSnapshot();
    expect(getInstallSnapshot()).toBe(before);

    startInstallListener();
    const after = getInstallSnapshot();
    expect(after).not.toBe(before);
    expect(getInstallSnapshot()).toBe(after);
  });

  it("serves a frozen server snapshot that hydration can match", async () => {
    const { getInstallServerSnapshot } = await load();
    const snapshot = getInstallServerSnapshot();

    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(getInstallServerSnapshot()).toBe(snapshot);
    expect(snapshot).toMatchObject({ installed: false, dismissed: false });
  });
});
