# Question roadmap

Where the bank goes next: what kinds of questions we want, how many of each,
where answers may come from, and what is still missing. Companion to
`docs/dataset.md` (schema, grounding rules) and issue #22 (150 per category).

Current state (2026-09-29): 168 questions, 116 published + 52 draft.
Per-category totals: history 10, people 22, labs 16, models 22, technology 10,
hardware 10, papers 8, benchmarks 6, memes 16, ethics 14, business 6,
products 6, open-source 6, concepts 16.

## 1. Question types we want

Not every true fact is a good quiz question. These are the shapes that work,
in priority order. (Anti-patterns — volatile facts, opinions, mismatched
option types, invented distractors — live in the question-author skill.)

1. **Origin stories.** Why a thing is called what it is called. DALL-E =
   Dalí + WALL-E, Claude = Claude Shannon, Gemini = twins (Brain + DeepMind
   merger) + NASA. Naming questions are the most shareable in the bank.
2. **Distinctions the reader wants to have.** "What problem does X solve"
   beats "what is X". GQA vs MQA, encoder vs decoder, RAG vs fine-tuning,
   open weights vs open source.
3. **Culture moments.** One event, one image, one clip the internet remembers.
   Tay, Sydney, Pope in a puffer jacket, glue pizza, vibe coding. These onboard
   casual players; memes + ethics + products carry them.
4. **Lineage.** Who built what, where, when — lab to model, paper to product,
   founder to company. The 2021–2025 lab exodus chain (OpenAI → Anthropic →
   SSI / Thinking Machines / Inflection → Microsoft) is one connected story
   worth telling across a dozen questions.
5. **Failure tales.** Bard's $100B demo error, Humane Pin, Rabbit R1, Tay,
   Air Canada's chatbot refund. Cautionary stories stick better than specs.
6. **Anchored numbers.** Only stable ones: release dates, parameter counts of
   old models, context sizes at launch, prize amounts. Always framed as
   history ("released in March 2023"), never as current records.

Deliberately deprioritized: pre-2000 history beyond the canon already covered
(Dartmouth → Deep Blue arc is done; no appetite for more). See §5.

## 2. Target distribution

- **Per category:** 150 minimum (issue #22). Thinnest first: business (6),
  products (6), benchmarks (6), open-source (6), papers (8), then technology
  (10), history (10), hardware (10).
- **Difficulty:** ~half at 1–2 (new-player survival), ~a third at 2–3,
  the rest 3–4, a sprinkle of 5. Calibrate honestly; when in doubt go lower.
- **Era mix (bank-wide, rough):** ~40% modern era (2020+, the ChatGPT
  shockwave and after), ~30% timeless foundations (transformers, scaling,
  classic ML), ~20% culture/memes/products, ~10% business/power. History
  stays capped — the app is about the field as it is now.
- **Answer slots:** even A/B/C/D across the bank (validator enforces <40%
  per slot; `npm run rebalance` reports drift — apply `--write` only after
  reviewing the diff).
- **Sources:** ≥90% verified (wikipedia + url). `none` stays rare; the
  explanation must then carry all teaching value.

## 3. Approved sources (in order)

1. **Wikipedia** — exact article titles, preferably grounding in the lead
   section (validator warns on body-only grounding). Watch redirects:
   `xAI` resolves nowhere, canonical is `SpaceXAI`; `Safe Superintelligence`
   redirects to `Safe Superintelligence Inc.`; people pages often use middle
   names (`Yann André Le Cun`, not `Yann LeCun`) — put the page's spelling in
   `answerAliases`.
2. **Primary sources (`url`)** — arXiv papers, official lab blog posts, model
   cards, launch announcements, company press pages. Better than Wikipedia
   for: Constitutional AI (arXiv:2212.08073), GPQA/SWE-bench (arXiv), anything
   too new for an article (World Labs launch via TechCrunch until Wikipedia
   catches up).
3. **Reference catalogs** — useful for *drafting*, dangerous for *grounding*:
   - **models.dev** — open catalog of which lab ships which model, with
     modalities and context windows. Great for models↔labs mapping questions.
     Volatile by nature: always frame historically ("as released in…", never
     "current best") and ground the final question on Wikipedia/primary.
   - **LMArena / Chatbot Arena** — fine for "how does blind pairwise voting
     work" (methodology, stable). Never for "who is top-ranked" (rots weekly).
   - **Epoch AI, Stanford HAI AI Index** — annual data (training compute,
     costs, adoption). Always pin the year in the question text.
4. **Reputable news (one-off)** — only for event facts with no primary page
   yet (funding rounds, launches). Prefer a HEAD-verified URL; upgrade to
   Wikipedia once an article exists.
5. **`none`** — last resort (e.g. `p(doom)`, slang with no article). Keep the
   count honest in batch reports.

**Volatility rule:** if the answer could change within a year, reframe it as
history or drop it. Valuations, "most capable", rankings, prices, and headcount
are out. Founding dates, release dates, acquirers, and "who built what" are in.

## 4. Waves

| Wave | Theme | Categories | IDs | Status |
| --- | --- | --- | --- | --- |
| 1 | Doomer lore, modern people, model lineage, lab mapping | mem, eth, con, ppl, mod, lab | mem-0009–0016, eth-0009–0014, con-0011–0016, ppl-0011–0022, mod-0011–0022, lab-0009–0016 | 52 draft, validated 2026-09-29 |
| 2 | Viral culture + AI in fiction | mem, eth, pro | mem-0017+, eth-0015+, pro-0007+ | planned |
| 3 | Modern stack (agents, efficient architectures, post-training) | tec, con, ben | tec-0011+, con-0017+, ben-0007+ | planned |
| 4 | Money + power (deals, chips, regulation) | bus, hwr, oss, eth | bus-0007+, hwr-0011+, oss-0007+, eth… | planned |

ID ranges never overlap; numbers are never reused.

## 5. Topic backlog (groomed, not scheduled)

**Wave 2 — viral culture (user-picked).** Tay (2016, 24h), Blake Lemoine /
LaMDA sentience (2022), Pope puffer + Balenciaga + Will Smith spaghetti
(2023 generative-image folklore), Loab, Shrimp Jesus / AI slop, Dead Internet
theory, DAN + grandma jailbreaks, Air Canada refund bot, DPD/Chevy chatbot
fails, Google AI Overviews glue pizza, NotebookLM Audio Overviews, vibe coding
(Karpathy, Feb 2025). Fiction canon: Asimov's Three Laws, HAL (have), Skynet
(have), Her + Sky voice, Ex Machina, Matrix simulation, Blade Runner
Voight-Kampff, Dune Butlerian Jihad, Iain Banks Culture Minds, Star Trek Data
/ Measure of a Man, Person of Interest (Machine vs Samaritan), GLaDOS
(Portal), Cortana (Halo → Microsoft assistant lineage), Black Mirror Be Right
Back, Neuromancer/Wintermute, Ghost in the Shell, SOMA, Detroit: Become Human.

**Wave 3 — modern stack (user-picked).** Agents: what is an agent, ReAct,
function calling (Jun 2023), MCP (Anthropic, Nov 2024), Claude Computer Use,
SWE-agent/OpenHands harnesses. Architectures: FlashAttention (Tri Dao),
GQA (the dataset's own example — still missing!), MQA (Shazeer 2019), RoPE,
SwiGLU, KV-cache / why attention is O(n²). Post-training: SFT, instruction
tuning / FLAN, DPO vs RLHF, LoRA/QLoRA, quantization (GGUF, llama.cpp stack),
distillation (have). Core concepts still missing: next-token prediction,
autoregressive, in-context / few-shot learning, attention mechanism itself,
embeddings + vector DBs, inference vs training, multimodal/CLIP, world
models + JEPA, pretraining vs post-training. Eval: needle-in-a-haystack,
prompt injection ("ignore previous instructions"), jailbreaks, sycophancy,
scheming / deceptive alignment / mesa-optimizers (doomer canon), Goodhart's
Law (ties benchmark saturation + reward hacking), Moravec's paradox, Bitter
Lesson, Chinese Room, ELK? Benchmarks: HumanEval, GSM8K/MATH, HellaSwag,
TruthfulQA, ARC + $1M prize, BIG-bench, GLUE/SuperGLUE, SQuAD, HELM, MT-Bench,
Humanity's Last Exam, FrontierMath, Loebner Prize (history of eval), Elo
origin (Arpad Elo — ties our own rating system).

**Wave 4 — money + power (user-picked).** Deals: Microsoft–OpenAI $13B arc,
Anthropic–Amazon/Google billions, xAI $6B (2024), Mistral €600M, SSI/Thinking
Machines raises, MosaicML $1.3B (Databricks), Character.ai / Inflection
acquihires, Scale–Meta $14.3B + Wang, Stargate $500B announcement, Musk v.
Altman lawsuit, Altman Worldcoin/World orb saga. Chips: TSMC (who actually
fabs Nvidia), ASML lithography, Blackwell naming + B200, H100/A100 workhorses,
DGX-1 donated to OpenAI (2016), Mellanox/InfiniBand, Groq LPU vs Grok
(name-collision gold), AMD MI300, Apple Neural Engine, export controls
(H800/A800), CHIPS Act, nuclear deals (Constellation/Three Mile Island +
Microsoft, Kairos + Google). Regulation: Asilomar principles, Bletchley
Declaration, Seoul commitments, SB-1047 veto, EO 14110 compute threshold,
EU AI Act (have), NYT lawsuit, Getty v. Stability, artists lawsuit, SAG-AFTRA
AI clause, Johansson/Sky, Gender Shades, COMPAS, Model Cards, Datasheets,
Maven revolt, killer robots / Slaughterbots, facial-recognition bans,
deepfake 2017 origin, Books3, ImageNet Roulette / Tiny Images deletion,
UK/US AI Safety Institutes, autonomous-weapons open letter (2015).

**Deferred — history backfill (user said no).** Kept here so nobody
re-proposes: PARRY, SHRDLU, Logic Theorist, Perceptrons book (1969),
Lighthill report, Fifth Generation, XCON, DENDRAL, Shakey, Stanford Cart,
ALVINN, BigDog, ASIMO, Watson Jeopardy 2011, Netflix Prize, Kaggle, DARPA
Grand Challenges, LISP machines? (have Lisp), Cyc (have). If history ever
reopens, start with Watson + Perceptrons book + Lighthill.

**People still missing (feeds any wave):** Jensen Huang, Lisa Su (+ Huang
family trivia), Satya Nadella, Elon Musk, Zuckerberg, Jeff Dean, John
Jumper, David Silver (AlphaGo), Alec Radford, Ashish Vaswani (+ Niki Parmar,
Illia Polosukhin, Llion Jones), Kaiming He, Tri Dao, François Chollet,
Jeremy Howard, Clem Delangue, Thomas Wolf, Jared Kaplan, Amanda Askell,
Jan Leike, John Schulman, Greg Brockman, Max Tegmark, Jaan Tallinn, Richard
Sutton (+ Barto, Turing 2024), Judea Pearl, Marvin Minsky, David Holz
(Midjourney), Emad Mostaque, Cristóbal Valenzuela (Runway), Jason Allen
(Colorado fair), Grimes/ghostwriter (AI music), Lex Fridman, Dwarkesh Patel,
Joy Buolamwini, Kate Crawford, Meredith Whittaker, Kai-Fu Lee, Alexandr Wang,
Morris Chang, Jim Keller, Pat Gelsinger (Intel saga).

## 6. Authoring workflow (unchanged)

Probe titles → draft batch (subagents, reserved IDs, `status: draft`) → merge
→ `npm run validate` (must pass) → `npm run review`, read `review/review.html`,
send feedback as `approve <id>` / `reject <id>: <reason>` / `edit <id>: <fix>`
→ apply, revalidate → `status: published` → `npx tsx scripts/publish.mts`
(dev; `--prod` for prod).

Authoring rules (question types, source tiers, title gotchas, review protocol)
live in the question-author skill, which is the single source of truth. This
doc owns planning: distribution, waves, backlog.
