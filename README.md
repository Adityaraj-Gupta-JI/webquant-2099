# WEBQUANT 2099

**A Multi-Agent Autonomous Financial Intelligence System for Explainable,
Risk-Aware Retail Investment Research.**

> Follow the signals. Understand the risk.

Retail research tools give you an answer. WEBQUANT gives you the answer *and*
every strand of evidence that produced it — as a graph you can walk.

---

## The pipeline

```
Data → Quant Core → Agents → Risk → Synthesis → Financial Evidence Web
```

| Stage | Where it lives | What it does |
| --- | --- | --- |
| Data providers | `src/data/providers.ts` | `MarketDataProvider` / `NewsProvider` interfaces. Demo implementations ship; live ones drop in behind the same interface. |
| **RAG pipeline** | `src/rag/` | Corpus → chunk → embed → vector store → filter + rank → threshold → citations. `VectorStore` / `EmbeddingProvider` are interfaces. |
| **Session store** | `src/session/store.ts` | Profile, watchlist, interaction history and per-run metrics, persisted to `localStorage`. |
| Quant Core | `src/quant/` | Pure, deterministic functions: SMA, EMA, Wilder RSI, momentum, annualised volatility, max drawdown → a transparent 0–100 signal score. |
| Agents | `src/agents/` | Six agents, each answering a *different* question, each returning typed evidence, risks, confidence and reasoning. |
| Orchestration | `src/lib/spiderSense.ts` | Phase state machine + typed event stream. Market and Fundamental run concurrently. |
| Graph | `src/lib/graph.ts` | Builds nodes/edges from the finished analysis. Deterministic layout. |
| Rendering | `src/components/WebCanvas.tsx` | Consumes graph state. Owns no business logic. |

### The six agents

| Agent | Question it answers |
| --- | --- |
| Market Intelligence | What does price and volume behaviour indicate? |
| Fundamental Analysis | What does the company's latest **disclosure** indicate? *(retrieval-grounded — every document claim carries a citation)* |
| News & Sentiment | What external information may affect the thesis? |
| Risk Intelligence | What could invalidate this thesis? |
| Investor Context | How does this interact with *your* portfolio and horizon? |
| 2099 Synthesis | What does the combined evidence indicate? |

Market, Fundamental and News **execute concurrently**. Risk and Investor run
downstream because they consume upstream output — parallelising those would be
theatre, not concurrency.

Agents are allowed to disagree. When they do, the spread is surfaced as
**analytical divergence** and it *lowers* the synthesis confidence rather than
being averaged away.

---

## Retrieval (RAG)

```
CORPUS → CLEAN → CHUNK → METADATA → EMBED → VECTOR STORE
QUESTION → OOD GATE → EXPAND → EMBED → FILTER → COSINE + BM25 → THRESHOLD → CITATIONS
```

9 synthetic disclosures across 4 issuers → 23 chunks, each carrying document,
type, section, page, date and source. A natural-language question, filtered by
issuer, drives retrieval; the Fundamental agent consumes the result and separates
`RETRIEVED:` from `INTERPRETATION:` in its reasoning.

Measured on the fixed eval set (`src/rag/evaluation.ts`, 19 cases):
**hit@1 85.7%, hit@3 100%, MRR 0.929, citation coverage 100%, 0 adversarial
false positives.** See [RAG_EVALUATION.md](RAG_EVALUATION.md).

Two things stated plainly, because they matter:

- **The embedding is lexical, not neural.** TF-IDF hashed vectors (384-d) with a
  finance concept lexicon, blended 60/40 with BM25. Real vector search, honestly
  labelled. A static client bundle has no key and no server to call a hosted
  embedding model, and `EmbeddingProvider` exists so one can be dropped in.
- **No vector database service.** An exact cosine scan over 23 chunks beats an
  ANN index at this size, and a network-dependent store would make "no network"
  a crash instead of a demo. `VectorStore` is an interface; pgvector substitutes
  without touching agents. Reasoning in [RAG_ARCHITECTURE.md](RAG_ARCHITECTURE.md).

**A citation is only ever built from a chunk the store returned**, so a
fabricated reference is structurally impossible. When retrieval finds nothing,
the agent says so, cites nothing, and has its confidence capped.

---

## Design principles

1. **Models never invent numbers.** Every quantitative value originates in the
   deterministic Quant Core or a data provider. Agents only interpret them.
2. **Every conclusion is traceable.** "Follow the Web" walks evidence → agent →
   contribution → synthesis, one highlighted strand at a time.
3. **Risk is a first-class output**, with an explicit list of conditions that
   would invalidate the current read.
4. **Demo data is never presented as live data.** Origin is labelled at every
   surface via `OriginBadge`.
5. **Retrieved content is untrusted.** Only extracted structured fields are
   carried forward — never raw HTML, never instructions found inside a document.
   Nothing is rendered with `dangerouslySetInnerHTML`.
6. **Citations quote their source verbatim.** Asserted in development and
   covered by a fidelity check — 1126/1126 source tokens preserved.
7. **No credentials in the client.** Live LLM/search integration is expected to
   run behind a server function; the bundle reads no private key.

---

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build to dist/
npm run preview    # serve the production build
npm run typecheck
```

### Demo deep links

Any analysis-backed route accepts `?auto=<TICKER>` to run the whole pipeline on
load, and `&instant=1` to skip the stage pacing:

- `#/analyze?auto=RELIANCE` — full orchestration, paced so you can watch it
- `#/web?auto=RELIANCE&instant=1` — straight to the populated evidence web
- `#/risk?auto=TCS&instant=1` — straight to the risk breakdown

### Compliance documents

[REQUIREMENT_MATRIX.md](REQUIREMENT_MATRIX.md) — every PS-01 dependency and
requirement, with the code that satisfies it and the caveats that remain.
[RAG_ARCHITECTURE.md](RAG_ARCHITECTURE.md) · [RAG_EVALUATION.md](RAG_EVALUATION.md) ·
[AUDIT_REPORT.md](AUDIT_REPORT.md)

### The 60-second demo

1. `/analyze` → **RELIANCE** → **Activate Spider-Sense**
2. Watch the phase track and event stream — real orchestrator state, not a fake
   loading bar
3. Agent cards land: Market reads bullish, News reads bearish
4. **Analytical divergence detected** — a 38-point spread, so the synthesis
   returns **WATCH**, not a confident buy
5. **Open the evidence web** → click any node → **Follow the Web** for the full
   evidence → agent → synthesis chain
6. §03 **Sources** → every retrieved passage with document, section, page, date,
   relevance and chunk id
7. §08 **Session metrics** → latency, chunks retrieved, citation coverage,
   convergence, portfolio concentration
8. `/portfolio` → watchlist, and **Personalisation, proven**: the same market
   input under two stored profiles, side by side
9. Back on `/analyze`, tick **Simulate degraded data** and re-run — the corpus
   goes unreachable, the pipeline completes, and the agent cites nothing rather
   than inventing a source

Try `INFY` for the convergent, cautiously-bullish case.

---

## Data

The shipped dataset is deterministic: price series are generated from a seeded
PRNG keyed on the ticker, against a fixed as-of date (`DEMO_ASOF`), so the same
input always produces the same analysis. Fundamentals and news items are curated
fixtures — headline, source, timestamp and an extracted fact only.

This means the product works with no network, no API key and no AI provider —
and it says so on screen.

---

## Deploying

Vercel (`vercel.json`) and Netlify (`netlify.toml`) configs are included.

```bash
npx vercel --prod        # or: npx netlify deploy --prod
```

Build command `npm run build`, output directory `dist`. No environment variables
are required — `VITE_ENABLE_LIVE` is optional and defaults to off.

---

## Limitations

Stated up front, because a judge will find them anyway.

- **The corpus is synthetic.** No real SEBI filing is ingested. Every document is
  labelled synthetic in the data, in the citation, and in the UI.
- **The embedding is lexical, not neural** — see above.
- **No LLM is called.** Agent interpretation is deterministic rule logic over
  real retrieved text. A deliberate trade: every output is reproducible and
  citable, and the system cannot hallucinate. Provider interfaces exist for a
  model to be dropped in.
- No live market data or search provider is wired up; the provider interfaces
  exist for that, and the UI labels the difference.
- The Quant Signal Score is a transparent weighted score, **not** a probability
  of profit, and nothing here is investment advice.
- The simulated investor profile is not connected to any brokerage account.
