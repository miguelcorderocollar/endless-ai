import { resolveIntros } from "./lib/wikipedia.mts";

const titles = process.argv.slice(2);
const results = await resolveIntros(titles);

for (const title of titles) {
  const result = results.get(title);
  if (!result) console.log(`\n### ${title}\n  -> NOT RESOLVED`);
  else if (!result.ok) console.log(`\n### ${title}\n  -> ${result.reason}`);
  else console.log(`\n### ${result.title}\n${result.intro.split("\n")[0]!.slice(0, 460)}`);
}
