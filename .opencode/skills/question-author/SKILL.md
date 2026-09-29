---
name: question-author
description: Use when writing, reviewing, or generating multiple-choice questions for Endless AI. Covers the schema, the category taxonomy, difficulty calibration, distractor craft, source grounding, and the rules that make generated questions fail. Triggers on writing quiz questions, generating a question batch, fixing validation failures, or reviewing question quality.
---

# Writing questions for Endless AI

You are writing questions for a quiz that thousands of AI engineers, researchers and
enthusiasts will play to prove how much they know. The bar is the one described in
`docs/dataset.md`. Read that file if you have not.

Your output is always a JSON array of question objects matching the schema. Nothing else.
No preamble, no markdown fence unless asked for one, no commentary.

## The one rule that matters most

Every answer must be supported by a source you have actually checked.

Do not write a question from memory and then invent a Wikipedia title to look credible. A
plausible-looking but wrong `source.title` is worse than `kind: "none"`, because the
validator will pass a question that sends a player to a page that does not support the
answer.

In order of preference:

1. A Wikipedia article you are confident exists and covers the answer. Use the exact article
   title as it appears on the site, not a guessed variant.
2. A `url` source when the primary source is better. ArXiv papers, official lab blog posts,
   model cards, official announcements. These are better sources than Wikipedia anyway.
3. `kind: "none"` when you genuinely cannot find a source. Keep these rare. The explanation
   field then has to carry the whole learning value.

### Models.dev, the authority for model questions

For anything about a specific model, check models.dev before Wikipedia. It is an open source
database of AI model specs (github.com/sst/models.dev, data stored as TOML files per
provider and model), and it is usually more current and more precise than the model's
Wikipedia article. It also has a JSON API (`/models.json`, `/catalog.json`) and lab pages
that group every canonical model by its author.

A model page lives at `https://models.dev/models/{lab}/{model}`, for example
`https://models.dev/models/alibaba/qwen3.8-max-prime/`, and it lists the lab, the model
family, the context window, the output limit, the release date, whether the weights are
open or closed, and every provider serving it with pricing. Use the model page as a `url`
source with a label like "Qwen 3.8 Max Prime on models.dev".

Good models.dev questions ask which lab makes a model, whether its weights are open or
closed, or what its context window is. Do not write questions about pricing or about which
model is newest. Those rot within months and the volatility lint will flag them anyway.

Two warnings. First, the validator only checks that a `url` source loads, not that it
supports the answer, so you have to actually read the model page yourself. Second, never
guess a page slug. Open the page or query the API and confirm the `{lab}/{model}` path
exists before you cite it.

If you are not sure whether a Wikipedia article exists, use `kind: "none"` with a good
explanation. The validator will tell you which ones it could not ground, and you can promote
them later once somebody checks.

## The schema

```json
{
  "id": "tec-0007",
  "text": "Question text ending in a question mark.",
  "options": ["Option one", "Option two", "Option three", "Option four"],
  "answer": "The exact text of the correct option",
  "category": "technology",
  "tags": ["short", "relevant"],
  "difficulty": 2,
  "explanation": "Two or three sentences. Says why the answer is right, and why the closest wrong option is wrong. No hedging, no 'it is worth noting'.",
  "source": {
    "kind": "wikipedia",
    "title": "Attention Is All You Need",
    "label": "Attention Is All You Need on Wikipedia"
  },
  "answerAliases": ["Alternative surface forms of the answer"],
  "status": "draft",
  "addedAt": "2026-09-28"
}
```

`answer` is the exact option string, not an index. Copy it character for character,
including punctuation. Use straight quotes. No smart quotes, no em dashes, no non-breaking
spaces.

`answerAliases` is what lets the validator confirm the source supports the answer. Include
every surface form that might appear in a source page: acronyms, full names, alternate
spellings, the short form when the option is the long form. For a question about an
organization, include the abbreviation and the full name. For a person, include their full
name and any disambiguated form.

## Categories

Valid values for `category`, with the prefix that must start the `id`.

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

## Difficulty calibration

The number is load-bearing. The Elo system maps it to a question rating, and if everything
is a 3 then the rating means nothing.

**1.** Someone who reads AI news has a decent shot. Which company shipped a model, who the
CEO is, what a famous product does.

**2.** You follow the field. Who introduced a technique, which lab did what, what a term
means.

**3.** You follow it closely and know why things happened. What problem a technique solves,
what a benchmark measures, who won a competition and how.

**4.** You have read the paper. Firsts, precise attributions, the difference between two
similar things, what was in an appendix.

**5.** Specialists and completists. Details that separate someone who works in the area from
someone who reads about it. The answer should still be verifiable.

When in doubt, go one lower. A question you are unsure is a 3 is usually a 2.

## Questions that fail, and why

These are the patterns that make a generated quiz feel cheap. Avoid all of them.

**Volatile facts.** Anything that changes. "Which lab has the most capable model right
now" has no answer next year. Prefer the historical framing. "Which company released Llama 2
in 2023" is stable. "Which company leads in open weights" is not.

**Opinions dressed as facts.** "Which model is the most creative", "which lab is the most
innovative". Never.

**Mismatched option types.** One year among three company names means the player can
eliminate two options by shape alone. All four options must be the same kind of thing.

**Obvious length tells.** If the correct answer is consistently the longest option, the
player learns to pick long. Make the options comparable in length.

**Invented distractors.** Do not make up a plausible-sounding fake to fill a slot. A real
thing that people genuinely confuse with the answer is far better. If you only have two
real options, write a different question.

**A question that needs its own explanation.** If the correct answer is only correct under
some interpretation, the question is broken.

**Double negatives and filler.** No "all of the above", no "none of the above", no "which
of the following is NOT".

**Leading or loaded wording.** "The revolutionary technique that..." biases the player.

**Two answers that are both right.** If a careful reader could defend a distractor, cut it.

**Genuinely obscure trivia with no hook.** Difficulty 5 is fine. A question about a
footnote in a 1994 workshop talk with no explanation value is not.

## Questions that work

**Facts with a story behind them.** The Dartmouth question works because there is a reason
you remember it wrong. The 1956 date, the four names, the term that got coined there.

**A distinction the reader wants to have.** "What problem does group query attention
address" beats "what is group query attention", because the second is a definition and the
first is understanding.

**Real confusions as distractors.** Asking who introduced the transformer, with "Attention
Is All You Need" as a paper distractor and other labs as lab distractors, catches people who
half remember.

**Culture.** The `meme` category is where the app picks up casual players, and those
questions are also the most shareable. HAL 9000, Clippy, move 37, ELIZA, the captcha, the
slop, Skynet. Grounding here is often a Wikipedia article about the fictional work rather
than about AI, which is fine and correct.

**Everything an expert knows and a casual reader does not.** The highest-value questions
come from the gap between the two audiences, not from trivia about either.

## The explanation field

This is the teaching moment, and it is read by people who just got the question wrong. It
should feel like a friend explaining it, not a textbook.

Say why the answer is right. Say why the most tempting wrong option is wrong. Add the detail
that makes it stick, like a date, a name, or the reason it happened. Two or three sentences.

Do not repeat the question. Do not restate the answer in different words and stop there.
That is the failure mode of a generated explanation, and it teaches nobody anything.

Weak:

> "The transformer architecture was introduced in the paper 'Attention Is All You Need'. It
> is based on the transformer architecture."

Strong:

> "Vaswani and seven colleagues at Google published it in 2017, and the whole
> sequence-to-sequence setup ran on self-attention with no recurrence and no convolution. It
> replaced the recurrent encoder-decoder setup that had dominated machine translation, and
> the 'Attention Is All You Need' title is where the field got the word transformer."

## Self-check before you return anything

Go through every question and answer these. If any answer is no, fix it before returning.

1. Is every answer actually supported by the source I cited?
2. Are all four options the same kind of thing?
3. Is the correct answer the longest, the shortest, or the only one with a number in it?
4. Could a careful reader defend one of the wrong options?
5. Is this fact going to still be true in a year?
6. Did I put the answer in the same slot every time? Shuffle across the batch.
7. Is the difficulty number honest?
8. Does the explanation teach something, or just restate the answer?
9. Is `answer` character-for-character identical to the option it refers to?
10. Is the `id` prefix correct for the category, and is the number unused?

## Batch generation

When asked for a batch, target a spread rather than a wall of one thing. For 100 questions
across 14 categories that is roughly 7 or 8 each, but weight the categories the audience
cares about. Keep difficulty 1 and 2 to about half the batch for the first release, since a
new player who hits five hard questions in a row bounces.

Report at the end, as plain text after the JSON: how many questions per category, the
difficulty spread, how many have a `wikipedia` source, how many have a `url` source, and how
many are `none`. Be honest about the `none` count. Do not claim grounding you did not do.
