# Jev (TypeSafe System One) — reference

What Jev is, how to call it, and its known failure modes — generic reference for any
decision task. Start from the [docs index](https://docs.typesafe.ai/llms.txt).

## What it is

Jev is TypeSafe's decision **model** — the first of their "System One" models. You send
**state** plus **typed questions**; you get back structured answers with **probabilities
and confidence instead of generated text**. It is not a chat model:

```
POST https://openrouter.ai/api/v1/chat/completions  {"model": "jev-1.13", ...}
→ 400: "jev-1.13 is a decisions model and cannot be used with the chat/completions endpoint"
```

- Pricing (OpenRouter): ~$0.042 per 1M **input** tokens, output free. Every response
  carries `usage.cost`.
- Context window: 32k tokens covering state **plus** questions (Jev suffers from
  context rot — see jaggedness below).
- One provider: TypeSafe. The response reports the exact build
  (e.g. `typesafe/jev-1.13-20260917`) — record it if you cache answers, so a model
  bump is visible.

## Endpoints

| | |
| --- | --- |
| **OpenRouter** | `POST https://openrouter.ai/api/alpha/decisions` with `Authorization: Bearer $OPENROUTER_API_KEY` |
| TypeSafe direct | `POST https://api.typesafe.ai/v1/systemone` with a `TYPESAFE_API_KEY` (TypeSafe SDKs target this) |
| Playground | https://console.typesafe.ai/playground |

Model slugs on OpenRouter: `jev-1.13`, `typesafe/jev-1.13`, `jev-latest` all resolve to
the same build; `jev-1.13.0` (the form in TypeSafe docs) does **not** work. Pin the
versioned slug — the `latest` alias moves on release and would silently invalidate
anything you cached against the old build.

## Request shape

```jsonc
{
  "model": "jev-1.13",
  "state": "…string, object, or array — the content to evaluate…",
  "questions": {
    "<id-you-choose>": {          // id never reaches the model; answers come back under it
      "type": "choice",           // "noul" | "choice" | "score"
      "instructions": "…",        // string, or object/array for structured questions
      "criteria": { … }           // shape depends on type (below)
    }
  }
}
```

### The three question types

| type | criteria | answer | use for |
| --- | --- | --- | --- |
| `noul` | `{ "true": …, "false": … }` (both keys required on OpenRouter) | `{ noul: number }` — P(yes) | yes/no questions: filter, verify, classify against a single condition |
| `choice` | map of option → description (max 255 options, `null` ok) | `{ choice, probabilities, confidence }` | picking one option from a set: route, pick, select, match |
| `score` | ordered **array** of level descriptions (2–10) | `{ score, legend, probabilities, confidence }` | rating along a rubric: severity, urgency, quality |

Notes that cost debugging time:

- `criteria` is required for **every** question, including `choice` (the error only says
  `path: ["questions", "<id>", "criteria"] expected record`).
- Option/description keys and values both reach the model — short names + separating
  descriptions (docs: "write descriptions that separate the options from each other").
- One request can carry many questions; they are evaluated in parallel.

### Confidence

`confidence` is **derived from the shape of `probabilities`**, not a separate model
output: all mass on one option → 1.0, flat → 0. For `k` options:
`confidence = (k · peak − 1) / (k − 1)` (e.g. 4 options: `(4·peak − 1)/3`).
TypeSafe's own default for "genuinely unsure, don't guess" is **0.5**.
It is not comparable across question types — `noul` answers don't carry one, and a
`choice`'s confidence does not translate to a `noul`'s probability (see structural
invariants below).

## Errors and retries

| status | meaning |
| --- | --- |
| 400 | malformed request — missing `criteria`, wrong `type`, or using chat/completions |
| 401 | bad/missing key |
| 402 | out of credits — on OpenRouter also check `error.metadata.limit_source` (in-flight budget vs. balance) |
| 429 | rate limited — back off exponentially, honor `Retry-After` |
| 529 (TypeSafe) / 500, 502, 503, 524 (OpenRouter) | overloaded or upstream failure — retry with backoff |

## Parallelization (how to run hundreds of questions in seconds)

Two independent axes, combinable:

1. **Many questions per request.** All questions in one call are evaluated in parallel
   against the shared state. TypeSafe's
   [parallel questions cookbook](https://docs.typesafe.ai/cookbooks/parallel_questions.md)
   measured it directly: batched vs. one-per-call returns **the same answers** (run-to-run
   std dev identical, batching adds no noise), and batching is up to ~12x cheaper / 10x
   faster when state dominates the request. Trade-off: every question in the batch sees
   the whole state, and jaggedness #5 says unrelated state costs accuracy.
2. **Many requests in flight.** OpenRouter enforces platform rate limits only on
   `:free` variants (20 RPM) and DDoS protection — **paid models have no platform-level
   request cap**. Fire requests concurrently with a worker pool; retry 429/5xx with
   exponential backoff.

Measured: **272 questions, one call each, pool of 32 concurrent requests → 4.5s wall
time, ~$0.005.** So one-call-per-question + concurrency gets you the clean setup (each
decision sees only its own state) at batched speed — prefer it unless the state is big
and shared across questions (then batch, per the cookbook).

## Jev 1.13 jaggedness — known failure modes

From the [official list](https://docs.typesafe.ai/model-jaggedness/jev-1.13.md). Check
here before blaming our code:

1. **Literal reading** — it answers the question you wrote, not the one you meant.
2. **Math and numbers** — does not count reliably; keep arithmetic in code.
3. **Date and time comparison** — reads dates as text, not ordered quantities; extract in code and compare there.
4. **Indirection** — double negatives and multi-hop questions lose accuracy.
5. **Large state full of irrelevant detail** — context rot; filter first, send only what the question needs.
6. **Adversarial content** — state is data, not treated as hostile.
7. **Contradictory instructions and criteria** — align them.
8. **Common-sense structural invariants don't hold** — a `noul` and a `choice` over the
   same options answer *different* questions (absolute vs. relative); don't expect
   `P(noul) = 1 − P(not noul)` or carry thresholds between types.
9. **No generation** — it is not trained to produce text; turn bounded answers into a `choice`.

## Links

- Docs index (start here): https://docs.typesafe.ai/llms.txt
- Primitives (noul / choice / score): https://docs.typesafe.ai/primitives
- Choice in depth: https://docs.typesafe.ai/primitives/choice
- Confidence: https://docs.typesafe.ai/confidence
- Jev 1.13 jaggedness: https://docs.typesafe.ai/model-jaggedness/jev-1.13
- HTTP API reference: https://docs.typesafe.ai/api
- State best practices: https://docs.typesafe.ai/concepts/state
- Parallel questions cookbook: https://docs.typesafe.ai/cookbooks/parallel_questions
- OpenRouter Jev hub: https://openrouter.ai/docs/guides/community/jev
- OpenRouter Decisions endpoint (OpenAPI): https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-request
- OpenRouter limits (429 handling): https://openrouter.ai/docs/api_reference/limits
- TypeSafe SDKs (JS/Python): https://docs.typesafe.ai/sdk
