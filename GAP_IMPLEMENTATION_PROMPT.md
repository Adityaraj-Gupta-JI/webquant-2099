# WEBQUANT 2099 — GAP IMPLEMENTATION PROMPT (PS-01 COMPLIANCE)

> Generated from a code-verified audit of the existing repository against the
> Hackverse PS-01 dependencies and minimum requirements.
> Built by Chetan Kumar (24BLC1059).

## CONTEXT — WHAT ALREADY EXISTS (DO NOT REBUILD)

React + TypeScript + Vite + Tailwind SPA, client-only, no backend.

| Layer | Location | State |
| --- | --- | --- |
| Deterministic quant core | `src/quant/` | Working. Pure functions. Do not touch the maths. |
| Six agents | `src/agents/` | Working, typed contracts, distinct roles. |
| Orchestrator | `src/lib/spiderSense.ts` | Working phase machine + typed event stream. |
| Evidence web | `src/lib/graph.ts`, `src/components/WebCanvas.tsx` | Working. Graph derived from analysis state. |
| Demo data | `src/data/` | Deterministic seeded fixtures, fixed as-of date. |
| UI | `src/pages/`, `src/components/` | Working. Do not restyle. |

## VERIFIED GAPS (each confirmed by reading the code, not assumed)

**P0 — FAIL, blocks the problem statement**

1. **RAG: absent entirely.** `DemoNewsProvider.fetchNews()` is
   `return DEMO_NEWS[asset.ticker] ?? []` — a dictionary lookup. No corpus, no
   chunking, no embeddings, no vector store, no query, no ranking, no threshold.
2. **Document corpus: absent.** ~10 two-line news blurbs. No filings, results,
   or disclosures.
3. **Vector / semantic retrieval: absent.** Zero occurrences of embed, vector,
   cosine, similarity, chunk, or rank in `src/`.
4. **Parallel agents: 2, requirement is ≥3.** `Promise.all` covers market +
   fundamental only (`spiderSense.ts:136`); news, risk, investor are sequential.
5. **Volume anomaly: not computed.** `Candle.v` is generated and stored, then
   never read. `marketAgent` claims "price *and volume* behaviour" — an
   overclaim in the code's own docstring.

**P1 — PARTIAL**

6. **Persistence: none.** Zero `localStorage` / `sessionStorage` / server. All
   state dies on refresh.
7. **Session performance metrics: none.** No latency, no counts, no session record.
8. **Watchlist: absent.** R5 asks for portfolio *or watchlist* state.
9. **Profiling: no stored params, no behavioural history, no A/B proof.**
   The personalisation logic works but nothing demonstrates it side by side.

## REQUIRED WORK

### R2 — RAG PIPELINE (highest priority)

Implement the full chain, each stage as its own module:

```
CORPUS → CLEAN → CHUNK → METADATA → EMBED → VECTOR STORE
       → QUERY → FILTER → SIMILARITY → RANK → DEDUPE → THRESHOLD
       → CONTEXT PACK → GROUNDED AGENT → CITATIONS → GRAPH
```

**Storage decision.** Do NOT add Supabase/pgvector. This app is client-only,
ships no credentials, and must work with no network (R8). Implement
`VectorStore` and `EmbeddingProvider` as interfaces with in-browser
implementations, so pgvector can be substituted later without touching agents.

**Embedding honesty.** No API key and no backend means no neural embedding
model. Implement TF-IDF-weighted hashed term vectors with a finance concept
lexicon for query expansion, and **label it accurately in the UI and docs** as a
local lexical-semantic index — never claim neural embeddings.

**Corpus.** Curated, clearly-labelled synthetic disclosures for the 4 indexed
companies: annual report, quarterly result, regulatory/exchange disclosure.
Real section names and page numbers, because those become the citation.

**Chunk schema.** `chunkId, documentId, ticker, company, documentType, source,
sourceUrl, publishedAt, page, section, chunkIndex, text, embedding`.
Deterministic IDs; dedupe on re-ingest.

**Retrieval.** Metadata filter (ticker/type/date) *and* similarity — never
similarity alone. Minimum relevance threshold; below it return
`NO_RELEVANT_EVIDENCE`. Never force a result.

**Grounding.** Wire into the Fundamental agent. It must separate retrieved fact
from interpretation, attach a citation to every retrieved claim, and report
insufficient evidence when retrieval fails. **Never fabricate a citation.**

**Graph.** Document and chunk become real nodes:
`DOCUMENT → CHUNK → AGENT → SIGNAL → RISK → SYNTHESIS`, with a
"Follow the evidence" walk. The spider path must reflect real retrieval state.

**Evaluation.** 10–20 fixed questions with expected ticker/doc-type/topic.
Measure hit@k, MRR, citation coverage, no-evidence handling. Adversarial set:
questions with no corpus support must return `NO_RELEVANT_EVIDENCE`.
Do not claim the metrics represent production performance.

### R1 — Volume anomaly
Add relative-volume-vs-20-day-average to the quant core as a real dimension, and
make the market agent's claim true.

### R3 — 3+ parallel agents
Market, fundamental (incl. retrieval) and news must dispatch concurrently.
Risk and investor stay downstream — they legitimately consume upstream output.

### R4 — Personalisation proof
Same market input, two stored profiles, visibly different output, side by side.

### R6 — Session metrics
Total latency, per-agent latency, retrieval latency, chunks retrieved, citation
coverage, convergence, risk concentration, data-source status. Compact panel.

### R7/R8 — Persistence + degraded data
`localStorage` for profile, watchlist, and session history. Degraded-data demo
that is user-triggerable: corpus unavailable → agent reports insufficient
evidence, cites nothing, pipeline completes.

## CHANGE CONTROL

Do not rewrite working systems, replace the UI, change the visual identity,
remove demo fallback, or add infrastructure. Smallest safe change. Typecheck and
build after every stage; fix regressions before continuing.
