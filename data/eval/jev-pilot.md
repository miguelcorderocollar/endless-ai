# Jev pilot — 30-question knowledge spot check

- **Model:** `typesafe/jev-1.13-20260917` (pinned as `jev-1.13`)
- **Date:** 2026-09-29
- **Bank:** 30 of 272 published questions — 10 easy (difficulty 1), 10 medium (2), 10 difficult (3–4), seeded random pick, options shuffled per question
- **Cost:** $0.00075 total — $0.00022 batched + $0.00053 solo
- **Method:** Jev is a decision model, not a chat model — no prompt, no generated text. Each question is a `choice` over criteria A–D sent to the decisions endpoint; the answer comes back as the selected option, the full probability distribution, and a confidence derived from its shape (for 4 options: `conf = (4·peak − 1) / 3`).
- **Batching:** one call per tier (10 questions in one state), plus a solo pass (one question per call) as a check against [context rot](https://docs.typesafe.ai/model-jaggedness/jev-1.13.md#large-state-full-of-irrelevant-detail) — see below.
- **Scoring:** `strict` = highest-probability option is correct. `recovered` = strict miss, Jev flagged itself unsure (confidence < 0.5, TypeSafe's own default floor), and the correct option still ranked 2nd with p ≥ 0.35. `lenient` = strict + recovered.
- **Caveat:** the questions are public in this repo, so this measures recall of published items as much as knowledge.

## Results

| tier | n | strict | recovered | lenient | miss | mean confidence |
| --- | --- | --- | --- | --- | --- | --- |
| easy | 10 | 10 (100%) | 0 | 100% | 0 | 0.98 |
| medium | 10 | 9 (90%) | 0 | 90% | 1 | 0.87 |
| difficult | 10 | 8 (80%) | 1 | 90% | 1 | 0.85 |
| overall | 30 | 27 (90%) | 1 | 93% | 2 | 0.90 |

## Per-question (batched)

verdict: ✅ strict · 🟡 recovered (Jev unsure + correct 2nd, p ≥ 0.35) · ❌ miss

| # | tier | id | category | q | correct | Jev pick (p) | 2nd (p) | conf | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | easy | `tec-0010` | technology | Prompt engineering refers to what exactly? | C. Structuring natural language inputs to s… | C (1.00) | A (0.00) | 1.00 | ✅ |
| 2 | easy | `lab-0001` | labs | Which series of models is OpenAI best known for developing? | D. The GPT series of large language models | D (1.00) | A (0.00) | 1.00 | ✅ |
| 3 | easy | `ben-0014` | benchmarks | Where does the Elo rating used in Chatbot Arena come from? | A. Chess player ratings by Arpad Elo | A (1.00) | B (0.00) | 1.00 | ✅ |
| 4 | easy | `mod-0019` | models | Which company develops the Qwen family of language models? | A. Alibaba | A (1.00) | B (0.00) | 1.00 | ✅ |
| 5 | easy | `con-0004` | concepts | Dropout is a technique for reducing what problem in neural networks? | A. Overfitting | A (1.00) | B (0.00) | 1.00 | ✅ |
| 6 | easy | `hwr-0014` | hardware | Which Nvidia chip became the workhorse of AI training during the 20… | C. H100 | C (0.86) | D (0.14) | 0.81 | ✅ |
| 7 | easy | `lab-0011` | labs | Which lab develops the Llama family of AI models? | C. Meta AI | C (1.00) | A (0.00) | 1.00 | ✅ |
| 8 | easy | `ppl-0007` | people | Who has been the chief executive officer of OpenAI since 2019? | D. Sam Altman | D (1.00) | A (0.00) | 1.00 | ✅ |
| 9 | easy | `ppl-0025` | people | Who became CEO of Microsoft in 2014 and backed OpenAI with billions? | C. Satya Nadella | C (1.00) | A (0.00) | 1.00 | ✅ |
| 10 | easy | `mod-0027` | models | GitHub Copilot was built through a partnership between GitHub and w… | B. GitHub and OpenAI | B (1.00) | A (0.00) | 1.00 | ✅ |
| 11 | medium | `ppl-0011` | people | Who founded the community blog LessWrong and co-founded the Machine… | B. Eliezer Yudkowsky | B (1.00) | A (0.00) | 1.00 | ✅ |
| 12 | medium | `ppl-0009` | people | Which researcher was a cofounder and head of Google Brain, and late… | B. Andrew Ng | B (0.93) | C (0.05) | 0.90 | ✅ |
| 13 | medium | `lab-0004` | labs | Which Hangzhou based AI company develops open weight models and is … | B. DeepSeek | B (0.85) | A (0.11) | 0.79 | ✅ |
| 14 | medium | `oss-0010` | open-source | Who started the llama.cpp project for running large language models… | A. Georgi Gerganov | A (1.00) | B (0.00) | 1.00 | ✅ |
| 15 | medium | `ben-0008` | benchmarks | What kind of items make up the GSM8K benchmark? | A. Grade-school math word problems | A (1.00) | B (0.00) | 1.00 | ✅ |
| 16 | medium | `oss-0004` | open-source | Under which licence is TensorFlow released? | C. The Apache Licence 2.0 | C (0.99) | A (0.01) | 0.98 | ✅ |
| 17 | medium | `mem-0022` | memes | Which phrase became shorthand for low-quality AI content after Shri… | B. AI slop | B (1.00) | A (0.00) | 1.00 | ✅ |
| 18 | medium | `mod-0002` | models | OpenAI released GPT-3 in 2020. Roughly how many parameters did it h… | A. 175 billion | A (1.00) | B (0.00) | 1.00 | ✅ |
| 19 | medium | `eth-0002` | ethics | Reward hacking happens when a reinforcement learning system does wh… | C. A student copying answers instead of lea… | C (0.96) | B (0.03) | 0.94 | ✅ |
| 20 | medium | `tec-0013` | technology | When did OpenAI introduce function calling for its chat models? | C. June 2023 | B (0.35) | C (0.27) | 0.13 | ❌ |
| 21 | difficult | `bus-0014` | business | Which biometric does the Orb built for World scan to issue a World ID? | D. Iris | C (0.61) | D (0.38) | 0.48 | 🟡 |
| 22 | difficult | `hwr-0010` | hardware | Nvidia was founded in 1993 by Jensen Huang and two co-founders. Wha… | D. Chris Malachowsky and Curtis Priem | D (1.00) | A (0.00) | 1.00 | ✅ |
| 23 | difficult | `tec-0012` | technology | What does the ReAct method combine in an AI agent? | C. Reasoning traces and acting with tools | C (1.00) | A (0.00) | 1.00 | ✅ |
| 24 | difficult | `lab-0016` | labs | Which AI lab was created by Google LaMDA developers Noam Shazeer an… | A. Character.ai | A (0.94) | D (0.06) | 0.91 | ✅ |
| 25 | difficult | `mod-0013` | models | What made DeepSeek-R1 notable when it launched in January 2025? | A. Open weights with frontier-level math an… | A (1.00) | B (0.00) | 1.00 | ✅ |
| 26 | difficult | `eth-0005` | ethics | Margaret Mitchell is best known for research on automatically remov… | A. Unwanted demographic biases | A (0.99) | C (0.01) | 0.99 | ✅ |
| 27 | difficult | `ppl-0021` | people | Which Transformer paper co-author went on to co-found and lead Cohe… | D. Aidan Gomez | D (0.92) | C (0.05) | 0.89 | ✅ |
| 28 | difficult | `ben-0010` | benchmarks | What does TruthfulQA measure in a language model? | C. Tendency to repeat popular falsehoods | C (1.00) | A (0.00) | 1.00 | ✅ |
| 29 | difficult | `eth-0017` | ethics | What did the 2024 tribunal hold in the Air Canada chatbot refund case? | A. The airline is liable for errors its cha… | A (0.66) | B (0.34) | 0.54 | ✅ |
| 30 | difficult | `bus-0002` | business | The AI bubble is a term for a stock market phenomenon said to have … | A. 2025 | D (0.76) | B (0.17) | 0.69 | ❌ |

## Batching check (batched vs. solo)

- Batched (10 questions/state): **27/30** strict
- Solo (1 question/call): **28/30** strict
- Picks that changed between modes: **1** — `tec-0013`

| id | batched pick (conf) | solo pick (conf) | correct |
| --- | --- | --- | --- |
| `tec-0013` | B (0.13) | C (0.21) | C |

## Observations

- **90% strict, 93% lenient — and the tiers discriminate.** 10/10 easy, 9/10 medium, 8/10 difficult batched (solo: 28/30). The bank's difficulty ladder does what it's supposed to, even at n=10.
- **Both misses are date questions.** `tec-0013` ("when did OpenAI introduce function calling") and `bus-0002` ("AI bubble … growing since when") both ask for a year, which is [Jev's documented weak spot](https://docs.typesafe.ai/model-jaggedness/jev-1.13.md#date-and-time-comparison) — "reads dates as text, not as ordered quantities." The bank punishes exactly what he's bad at.
- **Confidence sorted two of the three non-answers the way it should.** `tec-0013`: unsure (0.13), correct option 2nd but only p=0.27 → honest don't-know, not recovered. `bus-0014`: unsure (0.48) with the correct option a close 2nd (0.38) → recovered by the secondary rule, a genuine toss-up. `bus-0002`: **confident (0.69) and wrong** — the one failure confidence does not flag, which is why strict accuracy stays the headline number.
- **Probabilities are near-binary.** Most answers come back at p ≈ 1.0 or ≈ 0.0; Jev rarely hedges, so confidence separates "knew it" from "torn" rather than grading certainty finely.
- **Batching barely matters at this size.** One of 30 picks changed going from 10-question states to one question per call — and it flipped *toward* the correct answer (`tec-0013`, B → C). Context rot is real but negligible at 10 questions per state, so issue #39 can batch a tier per call.
- **Slight run-to-run drift.** The same question returned slightly different distributions across the two passes (`bus-0014`: p 0.59/0.40, conf 0.44 → 0.61/0.38, conf 0.48). Verdicts held except for that one flip; averaging runs (as `dupe` does with `RUNS = 2`) is the guard.
- **Cheap.** $0.00022 for 30 batched questions — a full 272-question pass runs ~$0.002 per model, cheap enough for #39's roster to re-run on every bank edit.
- **Not an eval model, and it shows.** Jev is built for narrow decisions over state, not trivia recall. 27/30 is respectable, but the failures cluster on date recall — knowledge, not judgment. The #39 roster should mix in generative models for which recall *is* the job, with Jev as the wildcard.

## Raw data

Per-question probabilities and full option text: `data/eval/jev-pilot.json`.
