import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The stats snapshot the profile paints from on revisit. Like the other
 * mirrors, the load-bearing part is what survives a hostile store: a first
 * run with nothing written, a truncated value, a shape from an older build.
 * AsyncStorage is stubbed with a Map; the module reads it on `hydrate`.
 */
const store = new Map<string, string>();

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => store.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => {
      store.delete(key);
    }),
    multiRemove: vi.fn(async (keys: string[]) => {
      for (const key of keys) store.delete(key);
    }),
  },
}));

async function load() {
  vi.resetModules();
  const module = await import("./statsCache");
  await module.hydrateStatsCaches();
  return module;
}

beforeEach(() => {
  store.clear();
});

describe("hydrateStatsCaches", () => {
  it("reads nothing on a first launch without failing", async () => {
    const { readHistory, readPopulation } = await load();
    expect(readHistory()).toBeNull();
    expect(readPopulation()).toBeNull();
  });

  it("survives truncated values instead of wedging the profile", async () => {
    store.set("endless-ai:stats-history:v1", "{not json");
    store.set("endless-ai:stats-population:v1", "[1,2");
    const { readHistory, readPopulation } = await load();
    expect(readHistory()).toBeNull();
    expect(readPopulation()).toBeNull();
  });

  it("round-trips what the queries resolve", async () => {
    const first = await load();
    first.writeHistory([
      { t: 1, r: 1000 },
      { t: 2, r: 1010 },
    ]);
    first.writePopulation({
      count: 19,
      median: 1045,
      buckets: [0, 0, 5, 9, 4, 1],
      percentile: 79,
      capped: false,
    });

    const second = await load();
    expect(second.readHistory()).toEqual([
      { t: 1, r: 1000 },
      { t: 2, r: 1010 },
    ]);
    expect(second.readPopulation()).toMatchObject({
      count: 19,
      median: 1045,
      percentile: 79,
    });
  });

  it("drops malformed rows and shapes instead of trusting the disk", async () => {
    store.set(
      "endless-ai:stats-history:v1",
      JSON.stringify([{ t: 1, r: 1000 }, { t: "x" }, null, 7]),
    );
    store.set(
      "endless-ai:stats-population:v1",
      JSON.stringify({ count: "many", buckets: "nope" }),
    );
    const { readHistory, readPopulation } = await load();
    expect(readHistory()).toEqual([{ t: 1, r: 1000 }]);
    expect(readPopulation()).toBeNull();
  });

  it("clears both mirrors on sign-out, on disk too", async () => {
    const first = await load();
    first.writeHistory([{ t: 1, r: 1000 }]);
    first.writePopulation({
      count: 1,
      median: 1000,
      buckets: [1],
      percentile: 100,
      capped: false,
    });
    first.clearStatsCaches();
    expect(first.readHistory()).toBeNull();
    expect(first.readPopulation()).toBeNull();

    const second = await load();
    expect(second.readHistory()).toBeNull();
    expect(second.readPopulation()).toBeNull();
  });
});
