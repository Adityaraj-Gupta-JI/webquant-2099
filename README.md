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
=======
markdown
<div align="center">

# 🕷️ WEBQUANT 2099

### **Follow the Signal. Understand the Risk.**

**A multi-agent financial intelligence system that transforms market data, quantitative signals, financial evidence, and investor context into explainable, risk-aware investment research.**

<br/>

[![Hackathon](https://img.shields.io/badge/HACKVERSE-2026-7c3aed?style=for-the-badge&logo=github&logoColor=white)](#)
[![Track](https://img.shields.io/badge/PS--01-Financial%20Intelligence-111827?style=for-the-badge)](#)
[![Status](https://img.shields.io/badge/STATUS-Active-22c55e?style=for-the-badge)](#)
[![React](https://img.shields.io/badge/React-18%2B-61DAFB?style=for-the-badge&logo=react&logoColor=black)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-5%2B-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](#)
[![AI](https://img.shields.io/badge/AI-Multi--Agent-8b5cf6?style=for-the-badge)](#)
[![RAG](https://img.shields.io/badge/RAG-Enabled-f59e0b?style=for-the-badge)](#)

<br/>

### 🌐 **[ LIVE DEMO ](#)** &nbsp;&nbsp; • &nbsp;&nbsp; 🧠 **[ ARCHITECTURE ](#)** &nbsp;&nbsp; • &nbsp;&nbsp; 📊 **[ DOCUMENTATION ](#)**

<br/>

</div>

---

## 🕸️ The Idea

> **The market is not a collection of isolated numbers. It is a web of connected signals, evidence, risks, and decisions.**

WEBQUANT 2099 is an interactive **multi-agent financial intelligence platform** designed to bridge the infrastructure gap between raw financial information and actionable investment research.

Instead of presenting a retail investor with another chart, news feed, or black-box AI answer, WEBQUANT coordinates specialized analytical agents across:

- 📈 Quantitative market signals
- 🏢 Fundamental financial analysis
- 📰 News & sentiment intelligence
- ⚠️ Risk analysis
- 👤 Investor profiling
- 📚 Retrieval-Augmented Generation
- 🔎 Evidence-backed reasoning
- 🕸️ Interactive financial knowledge webs

The result is a transparent analytical workflow where the user can follow:

```text
MARKET DATA
     ↓
QUANTITATIVE SIGNALS
     ↓
SPECIALIZED AGENTS
     ↓
FINANCIAL EVIDENCE
     ↓
RISK ANALYSIS
     ↓
PERSONALIZATION
     ↓
2099 SYNTHESIS ENGINE
     ↓
EXPLAINABLE INVESTMENT INTELLIGENCE
````

---

# 🎯 Problem

Retail investors have access to enormous amounts of financial information.

The problem is not **data availability**.

The problem is **data interpretation**.

A professional research infrastructure can simultaneously evaluate:

```text
Market Data
     +
Technical Indicators
     +
Fundamentals
     +
Regulatory Filings
     +
Earnings Information
     +
News
     +
Risk
     +
Portfolio Exposure
```

A retail investor often gets fragmented dashboards, isolated indicators, social-media opinions, or unexplained AI outputs.

WEBQUANT 2099 attempts to close this gap by introducing an **orchestrated reasoning layer** between financial data and the investor.

---

# 💡 Our Solution

WEBQUANT 2099 creates a coordinated financial intelligence environment where independent analytical agents investigate different dimensions of an asset before a synthesis layer produces a final assessment.

### Instead of:

```text
User → AI → Answer
```

WEBQUANT uses:

```text
                       ┌──────────────┐
                       │     USER     │
                       └──────┬───────┘
                              ↓
                    ┌──────────────────┐
                    │ Spider-Sense     │
                    │ Orchestrator     │
                    └────────┬─────────┘
                             ↓
             ┌───────────────┼───────────────┐
             ↓               ↓               ↓
        Market Agent    Fundamental Agent   News Agent
             ↓               ↓               ↓
             │          ┌────┴────┐          │
             │          │   RAG   │          │
             │          └────┬────┘          │
             │               ↓               │
             └───────────┬───┴───────────────┘
                         ↓
                    Risk Agent
                         ↓
                  Investor Context
                         ↓
                2099 Synthesis Engine
                         ↓
                 Explainable Output
                         ↓
                Financial Evidence Web
```

---

# 🧠 Core Intelligence Architecture

## 1. Quant Core

The quantitative layer converts raw market information into structured signals.

Potential signal dimensions include:

* Price momentum
* Volatility
* Volume anomalies
* Trend strength
* Technical indicators
* Relative performance
* Risk measures

Signals are transformed into structured outputs rather than being directly interpreted by an LLM.

```text
Raw Market Data
      ↓
Quant Calculations
      ↓
Signal Extraction
      ↓
Signal Classification
      ↓
Confidence
```

---

## 2. Multi-Agent Intelligence

WEBQUANT separates financial reasoning into specialized agents.

| Agent                     | Responsibility                             |
| ------------------------- | ------------------------------------------ |
| 🕷️ Market Agent          | Price, trend, volume & technical signals   |
| 🕷️ Fundamental Agent     | Financial documents & company fundamentals |
| 🕷️ Signal Agent          | News and market sentiment                  |
| 🕷️ Risk Agent            | Downside, volatility & portfolio exposure  |
| 🕷️ Investor Agent        | User risk profile & behavioral context     |
| 🕷️ 2099 Synthesis Engine | Cross-agent reasoning & final synthesis    |

Agents operate independently before their outputs are combined.

This reduces the dependency on a single monolithic prompt and makes the reasoning pipeline inspectable.

---

# 📚 Retrieval-Augmented Generation

WEBQUANT 2099 uses **RAG to ground financial reasoning in retrieved source material**.

Instead of asking an LLM to rely entirely on its internal knowledge:

```text
User Query
    ↓
Query Embedding
    ↓
Semantic Retrieval
    ↓
Financial Document Chunks
    ↓
Context Assembly
    ↓
Grounded Agent
    ↓
Cited Intelligence
```

### Document sources can include:

* Annual reports
* Quarterly results
* Regulatory disclosures
* Earnings transcripts
* Investor presentations
* Corporate announcements
* Curated financial research documents

Each indexed document can retain metadata such as:

```text
Document
Company
Ticker
Document Type
Publication Date
Section
Page
Source URL
Chunk ID
Embedding
```

This enables the system to preserve the relationship:

```text
COMPANY
   ↓
DOCUMENT
   ↓
EVIDENCE
   ↓
AGENT
   ↓
SIGNAL
   ↓
RISK
   ↓
SYNTHESIS
```

---

# 🕸️ Financial Evidence Web

The defining UX concept of WEBQUANT 2099 is the **Financial Evidence Web**.

Rather than displaying analytical reasoning as a long block of text, the system represents relationships between:

```text
Asset
 │
 ├── Market Signals
 │
 ├── Financial Evidence
 │      ├── Annual Report
 │      ├── Risk Disclosure
 │      └── Earnings Information
 │
 ├── News
 │
 ├── Risks
 │
 ├── Portfolio Exposure
 │
 └── Agent Conclusions
```

The user can follow the analytical chain.

### `FOLLOW THE EVIDENCE`

A user can conceptually trace:

```text
TCS
 ↓
Financial Risk
 ↓
Annual Report
 ↓
Retrieved Evidence
 ↓
Fundamental Agent
 ↓
Risk Agent
 ↓
2099 Synthesis
```

The web is therefore not just decorative visualization.

**It represents the underlying evidence and reasoning graph.**

---

# 🕷️ Spider-Sense Orchestration

The Spider-Sense Orchestrator coordinates the analytical agents.

It is responsible for:

* Dispatching agent tasks
* Managing execution state
* Collecting structured outputs
* Detecting incomplete responses
* Detecting analytical divergence
* Passing evidence into synthesis
* Measuring latency
* Producing a final reasoning context

### Agent convergence

```text
Market      → BULLISH
Fundamental → BULLISH
Sentiment   → NEUTRAL
Risk        → CAUTIOUS
```

The system can identify:

> **SIGNAL CONVERGENCE**

or:

> **ANALYTICAL DIVERGENCE DETECTED**

Instead of hiding disagreement, WEBQUANT surfaces it.

---

# ⚠️ Risk Intelligence

A financial signal does not exist independently from an investor.

A theoretically bullish asset may still be inappropriate for a particular portfolio.

WEBQUANT therefore considers:

* Investor risk preference
* Existing portfolio exposure
* Concentration
* Volatility
* Downside risk
* Signal confidence
* Market conditions

The system separates:

### Market Assessment

```text
What does the market indicate?
```

from:

### Personalized Assessment

```text
What might this mean in the context of this investor?
```

---

# 👤 Investor Context

The system can model an investor using parameters such as:

```text
Risk Preference
Investment Horizon
Portfolio Composition
Existing Exposure
Historical Interaction
```

The same market input can therefore result in different personalized assessments.

```text
                SAME MARKET DATA
                       │
          ┌────────────┴────────────┐
          ↓                         ↓
   Conservative                 Aggressive
   High Exposure                Low Exposure
          ↓                         ↓
   Risk-adjusted                Opportunity
   Assessment                   Assessment
```

---

# 📊 Explainability

WEBQUANT is designed around a simple principle:

> **Every important conclusion should have a traceable reason.**

The system can expose:

* Signal source
* Agent responsible
* Retrieved evidence
* Source document
* Confidence
* Risk factors
* Conflicting signals
* Personalization factors

Instead of:

> "BUY because AI says so."

the intended experience is closer to:

```text
ASSESSMENT
───────────
CAUTIOUSLY BULLISH

WHY?

✓ Positive momentum
✓ Improving volume profile
✓ Fundamental evidence supports stability

RISKS

⚠ Valuation sensitivity
⚠ Existing portfolio exposure
⚠ Conflicting short-term sentiment

EVIDENCE

→ Annual Report
→ Financial Disclosure
→ Market Data
```

---

# 🛡️ Degraded Data & Safety

Financial intelligence systems must handle incomplete information.

WEBQUANT includes degraded-data handling for scenarios such as:

* Missing market data
* Missing financial documents
* Retrieval failure
* Agent failure
* Conflicting agent outputs
* Low-confidence retrieval

The system should prefer:

```text
INSUFFICIENT EVIDENCE
```

over fabricated certainty.

Similarly, missing sources should never result in fabricated citations.

---

# 📈 Session Intelligence

The system can expose measurable session-level metrics including:

| Metric                       | Purpose                      |
| ---------------------------- | ---------------------------- |
| Agent Latency                | Measures agent response time |
| Retrieval Latency            | Measures RAG performance     |
| Portfolio Risk Concentration | Measures exposure            |
| Retrieved Evidence Count     | Shows research depth         |
| Citation Count               | Measures evidence coverage   |
| Signal Convergence           | Measures agent agreement     |

These metrics help turn the system from a visual demo into an observable analytical pipeline.

---

# ✨ What Makes WEBQUANT 2099 Different?

### 01 — Multi-Agent Financial Reasoning

Different analytical responsibilities are distributed among specialized agents rather than relying on one general-purpose prompt.

### 02 — Evidence-Grounded Intelligence

RAG connects financial reasoning to retrieved source material.

### 03 — Quant + AI Separation

Deterministic quantitative calculations are separated from probabilistic language-model reasoning.

### 04 — Investor-Aware Analysis

Market information is interpreted in the context of the investor rather than presented as universally applicable advice.

### 05 — Visual Explainability

The Financial Evidence Web turns an otherwise opaque reasoning process into an interactive structure.

### 06 — Analytical Divergence

Agent disagreement becomes a visible signal instead of being hidden by the synthesis layer.

### 07 — Human-Inspectable Reasoning

Users can investigate the path from:

```text
DATA → EVIDENCE → AGENT → RISK → SYNTHESIS
```

---

# 🏗️ System Architecture

```text
┌───────────────────────────────────────────────────────────┐
│                       WEBQUANT 2099                       │
└─────────────────────────────┬─────────────────────────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │     React UI        │
                   │ Financial Web       │
                   └──────────┬──────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │ Spider-Sense        │
                   │ Orchestrator        │
                   └──────────┬──────────┘
                              │
             ┌────────────────┼────────────────┐
             │                │                │
             ▼                ▼                ▼
        Market Agent    Fundamental Agent   News Agent
             │                │                │
             │                ▼                │
             │         ┌──────────────┐         │
             │         │ RAG Pipeline │         │
             │         └──────┬───────┘         │
             │                ▼                │
             │         ┌──────────────┐         │
             │         │ Vector DB    │         │
             │         └──────────────┘         │
             │                │                │
             └────────────────┼────────────────┘
                              ▼
                        Risk Agent
                              │
                              ▼
                       Investor Agent
                              │
                              ▼
                    2099 Synthesis Engine
                              │
                ┌─────────────┼─────────────┐
                ▼             ▼             ▼
             Signals         Risk        Evidence
                │             │             │
                └─────────────┼─────────────┘
                              ▼
                   Financial Evidence Web
                              │
                              ▼
                       User Decision
```

---

# 🧰 Technology Stack

## Frontend

![React](https://img.shields.io/badge/React-2026-61DAFB?style=flat-square\&logo=react\&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178C6?style=flat-square\&logo=typescript\&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-Build-646CFF?style=flat-square\&logo=vite\&logoColor=white)

* React
* TypeScript
* Vite
* Responsive UI
* Interactive graph visualization
* Component-based architecture

## AI / Intelligence

![AI](https://img.shields.io/badge/AI-Multi--Agent-8B5CF6?style=flat-square)
![RAG](https://img.shields.io/badge/RAG-Grounded-F59E0B?style=flat-square)

* Large Language Models
* Multi-agent orchestration
* Retrieval-Augmented Generation
* Embedding models
* Structured agent outputs
* Evidence-grounded synthesis

## Quantitative Layer

* Technical indicators
* Momentum analysis
* Volatility analysis
* Volume analysis
* Signal classification
* Confidence scoring
* Risk metrics

## Data & Retrieval

* Market data APIs / simulated market feeds
* Financial document corpus
* Semantic search
* Vector embeddings
* Vector database
* Metadata filtering
* Source attribution

## Visualization

* Financial Evidence Web
* Agent activity visualization
* Signal graphs
* Risk visualization
* Interactive evidence exploration
* Real-time analysis state

## Engineering

* TypeScript
* Modular services
* Typed interfaces
* Structured agent contracts
* Error handling
* Environment-based configuration
* Logging & telemetry

---

# 🗂️ Project Structure

```text
webquant-2099/
│
├── public/
│
├── src/
│   ├── components/
│   │   ├── agents/
│   │   ├── graph/
│   │   ├── quant/
│   │   ├── risk/
│   │   └── ui/
│   │
│   ├── agents/
│   │   ├── marketAgent.ts
│   │   ├── fundamentalAgent.ts
│   │   ├── newsAgent.ts
│   │   ├── riskAgent.ts
│   │   └── synthesisAgent.ts
│   │
│   ├── quant/
│   │   ├── indicators.ts
│   │   ├── scoring.ts
│   │   └── riskMetrics.ts
│   │
│   ├── graph/
│   │   ├── graphTypes.ts
│   │   ├── graphLayout.ts
│   │   └── graphRenderer.ts
│   │
│   ├── data/
│   │   ├── providers/
│   │   ├── demo/
│   │   └── schemas/
│   │
│   ├── hooks/
│   ├── lib/
│   ├── types/
│   └── App.tsx
│
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

> **Note:** The exact structure may evolve as the implementation grows.

---

# 🚀 Getting Started

## Prerequisites

Make sure you have:

* Node.js 18+
* npm / pnpm
* Git

Verify:

```bash
node --version
npm --version
git --version
```

---

## Installation

Clone the repository:

```bash
git clone https://github.com/<YOUR_USERNAME>/webquant-2099.git
```

Enter the project:

```bash
cd webquant-2099
```

Install dependencies:

```bash
npm install
```

---

## Environment Configuration

Create your local environment file:

```bash
cp .env.example .env
```

Add the required API credentials.

```env
# AI Provider
AI_API_KEY=

# Financial Data
FINANCIAL_DATA_API_KEY=

# Search / Retrieval
SEARCH_API_KEY=

# Vector Database
VECTOR_DATABASE_URL=
```

> Never commit `.env` or private credentials to GitHub.

---

## Run Locally

```bash
npm run dev
```

Open the local development URL shown by Vite.

---

## Production Build

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

---

# 🧪 Testing

WEBQUANT is designed around both functional and intelligence-level testing.

### Functional tests

```text
✓ Market analysis
✓ Agent execution
✓ RAG retrieval
✓ Evidence attribution
✓ Portfolio context
✓ Graph rendering
✓ Error handling
✓ Degraded data
```

### RAG evaluation

The retrieval layer can be evaluated using:

* Recall@K
* Hit@K
* Relevance
* Citation coverage
* Grounded-answer rate
* No-evidence handling

### Adversarial tests

The system should also be tested against:

```text
Unsupported claims
Missing documents
Conflicting documents
Agent failure
Unavailable data
Low retrieval confidence
```

---

# 🔍 Example Intelligence Flow

```text
USER

"I want to analyze TCS."

        ↓

INVESTOR PROFILE

Risk: Moderate
Horizon: Long
Exposure: Medium

        ↓

QUANT CORE

Momentum      → Positive
Volume        → Neutral
Volatility    → Moderate

        ↓

PARALLEL AGENTS

Market        → Bullish
Fundamental   → Positive
Sentiment     → Neutral
Risk          → Cautious

        ↓

RAG

Retrieve relevant financial evidence

        ↓

2099 SYNTHESIS

Identify:
• Supporting signals
• Contradictions
• Risks
• Investor-specific factors

        ↓

FINAL OUTPUT

Personalized, evidence-backed
financial intelligence
```

---

# 🧩 Design Philosophy

WEBQUANT uses a futuristic **dark-mode cyber interface** inspired by the visual language of webs, terminals, nodes, and intelligent systems.

The Spider/2099 metaphor is used as a **UX abstraction for connected intelligence**, not as a replacement for the underlying financial architecture.

### Visual principles

```text
Dark-first
      +
High information density
      +
Minimal visual noise
      +
Interactive graph structures
      +
Agent activity visualization
      +
Evidence-driven interaction
```

Small spider-like agents represent analytical processes moving through the financial web.

The objective is to make complex reasoning **explorable rather than intimidating**.

---

# 🧠 Responsible AI

WEBQUANT is an experimental financial intelligence and research system.

It is **not a registered investment advisor, broker, financial planner, or trading system**.

Outputs may contain:

* incomplete information
* model uncertainty
* data latency
* retrieval limitations
* incorrect interpretations

The system is intended for:

> **research, education, experimentation, and decision-support exploration.**

Users should independently verify financial information and conduct their own due diligence before making financial decisions.

---

# ⚠️ Current Limitations

The current prototype may be limited by:

* Availability of real-time market feeds
* Availability and quality of public financial documents
* Retrieval quality
* LLM limitations
* API rate limits
* Data latency
* Limited historical evaluation
* Prototype-level personalization
* Limited document corpus
* Demo-mode fallback data

These limitations do not eliminate the architectural objective; they define the boundary of the current prototype.

---

# 🔮 Future Roadmap

## Phase I — Prototype

* [x] Interactive financial intelligence UI
* [x] Quantitative analysis
* [x] Multi-agent architecture
* [x] Financial Evidence Web
* [x] Risk analysis
* [x] Investor context

## Phase II — Intelligence Layer

* [x] RAG architecture
* [x] Vector retrieval
* [x] Financial document corpus
* [x] Evidence attribution
* [ ] Advanced retrieval evaluation
* [ ] Reranking

## Phase III — Production Research Infrastructure

* [ ] Larger financial corpus
* [ ] More market data providers
* [ ] Historical backtesting
* [ ] Advanced portfolio optimization
* [ ] Persistent investor profiles
* [ ] Improved behavioral modeling
* [ ] Advanced agent memory
* [ ] Continuous market monitoring

## Phase IV — Autonomous Research

```text
Continuous Data
      ↓
Continuous Retrieval
      ↓
Continuous Agent Analysis
      ↓
Risk Monitoring
      ↓
Evidence Updates
      ↓
Investor Alerts
```

---

# 🏆 Hackathon Context

### HACKVERSE: INTO THE WEB

**Sprint 1 — Rapid Vibe Coding**

**Problem Statement:** PS-01

> **Multi-Agent Autonomous Financial Intelligence System for Retail Investors**

WEBQUANT 2099 is designed around the core challenge of transforming fragmented financial information into coordinated, explainable and personalized intelligence.

---

# 👥 Team

<div align="center">

| Member          | Role                           |
| --------------- | ------------------------------ |
| **[Chetan Chaudhary]** | AI / Multi-Agent Architecture  |
| **Om Upadhyay** | Frontend / UI & UX             |
| **Divyanshu Singh** | Quantitative Analysis / Data   |
| **Adityaraj Gupta** | Backend / RAG / Infrastructure |

</div>

### Team Members

* **Chetan Chaudhary** — [GitHub](https://github.com/Chetanchaudhary08)
* **Om Upadhyay** — [GitHub](2raised22is743)
* **Divyanshu Singh** — [GitHub](https://github.com/Baehtar)
* **Adityaraj Gupta** — [GitHub](https://github.com/Adityaraj-Gupta-JI/)

---

# 🙏 Acknowledgments

WEBQUANT 2099 was developed as part of the **HACKVERSE: INTO THE WEB** rapid vibe-coding sprint.

We acknowledge the value of:

* Public financial data
* Regulatory disclosures
* Financial research literature
* Open-source software
* AI-assisted development tools
* Quantitative finance research
* Knowledge graph and information-retrieval research

---

# 📚 References & Inspiration

The project draws conceptual inspiration from:

* Quantitative finance
* Multi-agent systems
* Retrieval-Augmented Generation
* Explainable AI
* Knowledge graphs
* Financial risk modeling
* Information retrieval
* Human-centered financial interfaces

---

# 📜 License

## All Rights Reserved

Copyright © 2026 **WEBQUANT 2099 Team**

All rights reserved.

This project and its source code may not be copied, reproduced, modified, distributed, sublicensed, or used commercially without explicit written permission from the copyright owner(s).

The repository is published for **hackathon evaluation, demonstration, academic discussion, and portfolio purposes**.

See [`LICENSE`](LICENSE) for the complete terms.

---

<div align="center">

## 🕷️ WEBQUANT 2099

### **The market is a web.**

**Follow the signal.
Trace the evidence.
Understand the risk.**

<br/>

`Built for HACKVERSE: INTO THE WEB — 2026`

<br/>

---

### Made with ⚡ AI • Quant • RAG • Data • Code

</div>
