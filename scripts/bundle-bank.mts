import { writeNativeBankBundle } from "../src/lib/questions/bankBundle";
import { checkNativeBank } from "./lib/nativeBank.mts";

/**
 * Writes `apps/mobile/assets/bank.json`: the published bank the Expo app
 * imports for offline play (#18, the native half of #17's bundled bank).
 *
 * Committed rather than generated per build, because a Metro bundle is built by
 * Gradle and nothing in the Next build can refresh it. `npm run validate` fails
 * when it drifts, so this is the only place that writes it and the check is
 * what catches a missed run.
 *
 * The web's `public/bank.json` is deliberately not written here. It is
 * regenerated on every Next build and dev boot from the same function, so it
 * has no drift to catch.
 */
const projectRoot = new URL("..", import.meta.url).pathname;

const { path, count } = writeNativeBankBundle(projectRoot);
console.log(`Bundled ${count} questions into ${path.replace(projectRoot, "")}`);

const stale = checkNativeBank(projectRoot);
if (stale) {
  console.error(stale);
  process.exit(1);
}
