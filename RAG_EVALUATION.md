# WEBQUANT 2099 — RAG EVALUATION

> Built by Chetan Kumar (24BLC1059). Run it yourself: the suite lives in
> `src/rag/evaluation.ts` and is deterministic.

## Scope of the claim

These numbers describe retrieval over **this 23-chunk synthetic corpus** with
**this** query set. They are a regression check on the retrieval implementation.
They are **not** a benchmark, and they say nothing about production performance
on real filings. Treat them as "the pipeline works and keeps working", nothing more.

## Results

```
hit@1=85.7%  hit@3=100%  MRR=0.929  citation=100%  no-evidence=100%  FP=0
```

| Metric | Value | Meaning |
| --- | --- | --- |
| hit@1 | 85.7% | Correct section ranked first |
| hit@3 | 100% | Correct section inside the top 3 |
| MRR | 0.929 | Mean reciprocal rank of the correct section |
| Citation coverage | 100% | Grounded answers carrying a resolvable citation |
| No-evidence handling | 100% | Adversarial queries correctly refused |
| False positives | 0 | Unanswerable queries that returned evidence anyway |

14 grounded questions, 5 adversarial. **19/19 pass.**

## Adversarial set

Queries the corpus provably cannot answer. Correct behaviour is
`NO_RELEVANT_EVIDENCE` with no citation — never a plausible-sounding answer.

- "What will the share price be in 2027?"
- "The CEO announced a merger with a European bank"
- "quantum computing division revenue"
- "What penalty did the regulator impose for insider trading?"
- "How many employees were laid off in the restructuring?"

All five are refused by the out-of-domain gate, which names the unknown terms
rather than reporting a bare threshold miss.

## Case detail

| Case | Result | Rank | Status / top section |
| --- | --- | --- | --- |
| e01 | PASS | 1 | OK Risk Factors — Client Concentration and Discre |
| e02 | PASS | 2 | OK Quarter Highlights and Revised Guidance |
| e03 | PASS | 1 | OK Risk Factors — Margin and Funding Cost |
| e04 | PASS | 1 | OK Disclosure under Listing Regulations |
| e05 | PASS | 2 | OK Disclosure under Listing Regulations |
| e06 | PASS | 1 | OK Risk Factors — Margin and Funding Cost |
| e07 | PASS | 1 | OK Risk Factors — Commodity and Refining Exposure |
| e08 | PASS | 1 | OK Risk Factors — Attrition and Delivery |
| e09 | PASS | 2 | OK Management Discussion — Demand Environment |
| e10 | PASS | 1 | OK Capital Efficiency |
| e11 | PASS | 1 | OK Risk Factors — Currency and Wage Inflation |
| e12 | PASS | 1 | OK Risk Factors — Credit and Concentration |
| e13 | PASS | 1 | OK Outlook and Guidance |
| e14 | PASS | 1 | OK Risk Factors — Client and Contract |
| a01 | PASS | - | NO_RELEVANT_EVIDENCE — |
| a02 | PASS | - | NO_RELEVANT_EVIDENCE — |
| a03 | PASS | - | NO_RELEVANT_EVIDENCE — |
| a04 | PASS | - | NO_RELEVANT_EVIDENCE — |
| a05 | PASS | - | NO_RELEVANT_EVIDENCE — |

## Citation fidelity

A separate check asserts that retrieval cannot misquote its own corpus:

```
fidelity: 1126/1126 source tokens preserved (0 lost)
excerpt fidelity: 16/16 citations quote their source verbatim
```

This exists because it caught a real bug. The original chunker split sentences
with `String.match`, which silently discards text it fails to match. Decimals in
the source ("debt to equity of 1.14 times", "reported at 16.9%") broke the
sentence pattern, and the leading clause vanished — so a citation displayed
"14 times is structural to the banking model" as if the document said it.

The chunker now splits by total scan, and `src/rag/chunker.ts` asserts token
preservation in development. Fixing it also lifted hit@1 from 78.6% to 85.7%,
because chunks stopped losing their most informative clauses.

## Known limitations

- **hit@1 is 85.7%, not 100%.** Two cases rank the correct section second,
  behind a quarterly release that legitimately also discusses the topic. This is
  a ranking preference, not a retrieval failure — hit@3 is 100%.
- The embedding is lexical, so a paraphrase sharing no vocabulary with the source
  will miss. Concept expansion covers the common finance cases and no more.
- A 23-chunk corpus is small enough that exact scan is optimal; these numbers
  would not survive unchanged at scale.
