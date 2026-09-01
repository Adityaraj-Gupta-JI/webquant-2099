# WEBQUANT 2099 — RAG ARCHITECTURE

> Built by Chetan Kumar (24BLC1059).

## Pipeline

```
CORPUS  →  CLEAN  →  CHUNK  →  METADATA  →  EMBED  →  VECTOR STORE
                                                          │
QUESTION → OOD GATE → EXPAND → EMBED → METADATA FILTER → SIMILARITY
                                                          │
                    BM25 BLEND → BOOSTS → THRESHOLD → DEDUPE → RANK
                                                          │
                          CONTEXT PACK → GROUNDED AGENT → CITATIONS → GRAPH
```

| Stage | Module |
| --- | --- |
| Corpus | `src/rag/corpus.ts` — 9 synthetic disclosures, 4 issuers |
| Clean + chunk | `src/rag/chunker.ts` — section-aware, sentence-boundary, 30-word overlap |
| Embed | `src/rag/embeddings.ts` — `EmbeddingProvider` interface |
| Store | `src/rag/vectorStore.ts` — `VectorStore` interface |
| Lexical | `src/rag/lexical.ts` — BM25 + out-of-domain detection |
| Ingest | `src/rag/ingest.ts` — deterministic ids, dedupe, stats |
| Retrieve | `src/rag/retriever.ts` — filter + rank + threshold |
| Ground | `src/agents/grounding.ts`, `src/agents/fundamentalAgent.ts` |
| Evaluate | `src/rag/evaluation.ts` |

## Two decisions worth defending

### 1. No Supabase / pgvector

The plan recommended it. It is the wrong call for **this** codebase:

- The app is client-only with no server, so a hosted DB means shipping
  credentials in the bundle — explicitly forbidden by the project's own rules.
- R8 requires the pipeline to work under degraded data. A network-dependent
  vector store makes "no network" a crash instead of a demo.
- The corpus is 23 chunks. An ANN index over 23 vectors is slower and less
  accurate than an exact scan. Adding it would be infrastructure as decoration.

`VectorStore` and `EmbeddingProvider` are interfaces precisely so pgvector can
be substituted when there is a server and a corpus large enough to need one.
Nothing above the interface would change.

### 2. The embedding is lexical, and says so

There is no API key and no backend, so a hosted embedding model is unavailable.
The implementation is **TF-IDF weighted hashed term vectors (384-d) with finance
concept expansion** — real vector similarity search, fully deterministic, and
inspectable. It is labelled as a local lexical-semantic index in the UI and here.
It is **not** a sentence transformer and is never described as one.

Retrieval blends it with BM25 (60/40) because cosine alone underperformed on
short queries against short chunks — measured, not assumed.

## Out-of-domain gate

A query the corpus cannot answer will still find weak overlap on one common word
and squeak past a similarity threshold. So before ranking, retrieval measures the
share of query terms absent from the corpus vocabulary. Above 50%, it returns
`NO_RELEVANT_EVIDENCE` with the offending terms named. This catches
"quantum computing division revenue" for the right reason, and can be explained
to a user in a way a tuned float cannot.

## Grounding contract

```ts
RetrievedChunk  // text + similarity + full provenance + matched terms
Citation        // document, source, page, section, date, chunkId, excerpt
RAGContext      // question + result + citations + assembled context
AgentResult.citations / .retrieval   // grounded output contract
```

**A citation is only ever constructed from a chunk returned by the store**
(`toCitation` reads from the index). A fabricated reference is structurally
impossible, not merely discouraged.

The Fundamental agent separates `RETRIEVED:` lines from `INTERPRETATION:` lines
in its reasoning. Retrieved passages may shift its structured score by at most
±12 points — a document can qualify the numbers, never overrule them.

## Failure modes

| Case | Behaviour |
| --- | --- |
| No relevant documents | `NO_RELEVANT_EVIDENCE`, zero citations, confidence capped at 0.55 |
| Below threshold | Same; the note states the threshold |
| Out of domain | `NO_RELEVANT_EVIDENCE`, unknown terms named |
| Corpus unavailable | `CORPUS_UNAVAILABLE`, pipeline completes, agent states it cites nothing |
| Embedding failure | `EMBEDDING_FAILED`, caught, pipeline completes |

In every case the agent makes no document-grounded claim. It never invents one.
