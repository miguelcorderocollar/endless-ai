import type { Question } from "./schema";
import { parseBankFile } from "./bankFile";

/**
 * The bundled fallback bank (#17): `public/bank.json`, a stable-URL snapshot
 * of the validated content bank generated on every build (`next.config.ts`).
 *
 * Why a JSON file instead of importing the content modules: the fallback is
 * only ever needed on a device that never fetched the app's hashed chunks
 * while online, and hashed chunk names are unknowable until after the build —
 * so a dynamic `import()` of the content can 404 offline. A stable URL is
 * precached by the service worker by name and always resolves. Fetched lazily,
 * only on the draw-failure-with-no-cache path; every online path never
 * touches it.
 *
 * The row check is `parseBankFile`, shared with the native app's baked-in bank,
 * so a corrupt row is judged the same way on both sides.
 */

/**
 * The URL the service worker precaches and this module fetches. A named
 * export so the contract test pins it: both sides must name the same file or
 * the offline fallback 404s.
 */
export const BANK_JSON_URL = "/bank.json";

let cached: Question[] | null = null;

/** The whole published content bank, in file order. Empty when unreachable. */
export async function loadFallbackBank(): Promise<Question[]> {
  if (cached) return cached;
  try {
    const response = await fetch(BANK_JSON_URL);
    if (!response.ok) return [];
    // Full schema parse, not a shape check; see `parseBankFile`.
    cached = parseBankFile(await response.json());
    return cached;
  } catch {
    return [];
  }
}
