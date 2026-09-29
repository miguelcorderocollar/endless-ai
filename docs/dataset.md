# The question bank

This is the part of the project that decides whether the app is good. The UI is three
screens and we can build it in a week. A question bank with 2000 verified questions and
good difficulty spread is a few months of work, so it gets the real design attention.

## The Learn button problem

Endless Quiz links every question to a Wikipedia article. In AI that is harder, and you
flagged it as the thing you did not know how to solve. The fix is to stop treating the
source as an optional afterthought and make it a required field that the pipeline checks
before a question is allowed to ship.

Every question carries exactly one source, in one of three shapes:

- A Wikipedia article, when one exists and actually covers the answer
- A URL, for papers, model cards, lab posts and announcements where the primary source is
  better than Wikipedia
- Nothing, for the small number of questions where no source exists. The button hides and
  the written explanation carries the teaching.

The number to watch is the share of questions with a verified source. Target is 90% or
better. The validator prints it.

## Schema

One JSON file per category in `content/questions/`. Each file is a flat array.

```json
[
  {
    "id": "hst-0042",
    "text": "Which 1956 workshop is usually credited as the birth of artificial intelligence as a field?",
    "options": [
      "The Dartmouth Summer Research Project",
      "The Stanford AI Laboratory meeting",
      "The Alan Turing Symposium",
      "The MIT Summer Vision Project"
    ],
    "answer": "The Dartmouth Summer Research Project",
    "category": "history",
    "tags": ["foundational", "symbolic"],
    "difficulty": 1,
    "explanation": "John McCarthy coined the term 'artificial intelligence' at the Dartmouth workshop in 1956. The proposal that started it was written by McCarthy, Marvin Minsky, Nathaniel Rochester and Claude Shannon.",
    "source": {
      "kind": "wikipedia",
      "title": "Dartmouth workshop",
      "label": "Dartmouth workshop on Wikipedia"
    },
    "answerAliases": ["Dartmouth Summer Research Project", "Dartmouth workshop"],
    "status": "published",
    "addedAt": "2026-09-28"
  }
]
```

### Field notes

`id` is `<category prefix>-<number>`, never reused, never renumbered. It is how runs,
review comments and the question sheet refer to a question, so it has to be stable for the
life of the project.

`answer` is the exact text of the correct option rather than an index into the array. It
looks redundant and it is, but an index silently breaks the moment somebody reorders the
options. String equality does not. The validator asserts that exactly one option matches.

`explanation` is always written, even when a source exists. People read it whether they got
the question right or wrong, and it is the whole learning value on questions with no link.
Two or three sentences.

`source.kind` is `wikipedia`, `url` or `none`. For `wikipedia` the validator resolves the
title against the live Wikipedia API. For `url` the validator requires `label` and a real
https URL.

`answerAliases` is only used by the validator. It exists so a question can be grounded
when the option text is not a literal substring of the source, which happens constantly
with names, transliterations and acronym expansions.

`status` is `draft`, `review`, `published` or `rejected`. Only `published` gets shipped.

## Categories

Fourteen. The prefixes are fixed because they are in the IDs. `category` must use the
exact schema key.

| Prefix | Category key | Label |
| --- | --- | --- |
| `hst` | `history` | History |
| `ppl` | `people` | People |
| `lab` | `labs` | Labs |
| `mod` | `models` | Models |
| `tec` | `technology` | Technology |
| `hwr` | `hardware` | Hardware |
| `pap` | `papers` | Papers |
| `ben` | `benchmarks` | Benchmarks |
| `mem` | `memes` | Memes |
| `eth` | `ethics` | Ethics |
| `bus` | `business` | Business |
| `pro` | `products` | Products |
| `oss` | `open-source` | Open source |
| `con` | `concepts` | Concepts |
| `con` | Concepts | Perplexity, overfitting, gradient descent, epochs, parameters, the fundamentals |

Target of at least 150 per category, so the endless stream does not dry up. `meme` and
`con` are the easiest to write and the ones that grow the audience fastest. `pap` and
`tech` are the ones that make the app feel serious to the people who will evangelize it.

## Difficulty

One to five, and the label means the same thing everywhere.

| Level | Means | Example |
| --- | --- | --- |
| 1 | Anyone who follows the news gets this | Which company released GPT-4? |
| 2 | You have to know the field, not just read headlines | Which team introduced the transformer architecture? |
| 3 | You follow it closely | What problem does group query attention solve? |
| 4 | You have read the paper | Which of these was the first use of RLHF at this scale? |
| 5 | Specialists and completists only | Which of these two labs ran the same eval and disagreed by how much? |

The Elo math in `PLAN.md` maps these to question ratings of 800 through 1600, so the
labels are load-bearing. Do not inflate them. A bank where everything is 3 makes the rating
mean nothing.

## What makes a good question here

**Fact, not opinion.** No questions about which model is best. Those have no answer in six
months and they start flame wars in the comments.

**Stable, not current.** "Which company released Llama 2" is a good question. "Who has the
most capable model" rots within a quarter. The validator has a soft lint for this.

**Every option the same kind of thing.** Four company names, or four years, or four people.
Mixing a year in with three names makes it solvable without reading the question.

**Distractors that are real.** The best wrong answers are things that genuinely confuse
people. "Stanford AI Lab" as a distractor for Dartmouth is a better wrong answer than
anything invented, because students really do half remember it that way.

**No filler phrases.** No "all of the above", no "none of the above", no options that end
in an asterisk.

**Answer position is random.** The validator enforces it. A bank where the answer is B 45%
of the time is worse than useless, it teaches the player to guess.

**One idea per question.** If it needs a comma to explain, split it.

## Grounding, and how the validator enforces it

Run `npm run validate` before shipping anything. It does seven things.

1. Parses every file against the schema. Missing fields, wrong types, categories outside the
   taxonomy, difficulty outside 1 to 5.
2. Checks the answer matches exactly one option, rejects duplicate options ignoring case and
   accents, and rejects duplicate question text using a normalized hash.
3. Checks the correct answer is not systematically in the same slot. Over 40% in any
   position fails the run.
4. Checks distractor shape. Rejects an answer that is the longest or shortest option far
   more often than chance, rejects options containing "all of the above" or "none of the
   above", rejects one option being a superstring of another, and rejects numeric options
   mixed with non-numeric ones.
5. Checks the source. For each `wikipedia` source it fetches the page, fails on
   disambiguation and redirect pages, then confirms the answer or one of its aliases appears
   in the page text. Results are cached on disk so repeat runs are fast and the Wikipedia
   API is not hammered. For each `url` source it does a HEAD request.
6. Runs the volatility lint, flagging questions containing superlatives or recent years.
   These are warnings, not failures, and they are the list of things to rewrite each year.
7. Prints coverage: per-category counts, the difficulty histogram, the answer position
   histogram, and the percentage of questions with a verified source.

A question that fails grounding is not deleted. It goes back to the author with the reason,
because a grounding failure usually means the question is subtly wrong, and the fix is
usually to reword the question to match what the source actually says.

## Authoring workflow

1. Pick a category and a difficulty band.
2. Generate candidates following `.opencode/skills/question-author/SKILL.md`.
3. Run `npm run validate`. Fix everything it reports.
4. Run `npm run dupe` and adjudicate every pair it flags. Record the outcome in
   `data/dupe/labelled.json`.
5. Read the questions yourself. The validator cannot tell you whether a question is
   interesting, only whether it is well formed and probably true.
6. Set `status` to `published`.
7. `npx tsx scripts/publish.mts` syncs the published questions to Convex dev (`--prod` for prod).

The human review in steps 4 and 5 is not optional. The validator catches malformed
data and unsupported answers. It cannot catch a question that is technically true and
completely boring, and it cannot catch a reworded repeat of a question you already
have. A bank of boring questions, or one that quietly doubles up, is what kills a
quiz app.

## Near-duplicates, which the validator cannot see

`validate` rejects byte-identical question text. It cannot see that "Which **company**
develops the Grok family?" and "Which **lab** develops the Grok family?" ask the same
thing, because token overlap between them is low. Six such pairs shipped before
`npm run dupe` existed (issue #38), two of them from a single 39-question batch.

`npm run dupe` finds them in two stages. Embeddings
(`qwen/qwen3-embedding-8b`, truncated to 1024 dims) shortlist the closest pairs by
cosine; then one calibrated Noul per candidate pair asks whether the two test the same
fact. The whole bank is never sent to the model, because its budget is 64k tokens per
request and unrelated state measurably degrades it.

The threshold is `0.7`, tuned against hand-adjudicated pairs. It is a **review
threshold, not a correctness one**: at 0.7 the flagged set is dominated by
lookalikes, and a person decides each one. A shared correct answer is not a shared
fact, and that is the most common false positive.

Cost is negligible and cached, so it is worth running every batch. Verdicts live in
`data/dupe/verdicts.json` and are keyed on question *content*, so editing a question
forces a fresh judgement rather than reusing a verdict about text that no longer
exists. Re-runs are free; a new batch of 40 questions adds roughly 70-100 pairs, which
is under a tenth of a cent.
