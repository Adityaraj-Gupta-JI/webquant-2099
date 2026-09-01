import { getIndex, isCorpusAvailable } from './ingest';
import { outOfDomainRatio, squash } from './lexical';
import { expansionTerms, tokenize } from './text';
import type {
  Citation,
  RAGContext,
  RetrievalQuery,
  RetrievalResult,
  RetrievedChunk,
} from './types';

/** Below this cosine score a chunk is not evidence, it is noise. Retrieval
 *  returns NO_RELEVANT_EVIDENCE rather than padding the result out. */
export const MIN_SCORE = 0.16;
/** Above this share of never-seen query terms, the query is about something the
 *  corpus does not cover, and the honest answer is "no evidence". */
export const MAX_OOD_RATIO = 0.5;
/** Blend weight: lexical BM25 vs vector cosine. */
const LEXICAL_WEIGHT = 0.6;
const DEFAULT_TOP_K = 4;

/** Metadata boosts applied on top of similarity. Retrieval is never similarity
 *  alone — recency and document authority matter in finance. */
const TYPE_WEIGHT: Record<string, number> = {
  regulatory_disclosure: 1.1,
  quarterly_result: 1.08,
  annual_report: 1.0,
  earnings_transcript: 1.0,
};

function recencyBoost(publishedAt: string, asOf = '2025-11-14'): number {
  const days = (Date.parse(asOf) - Date.parse(publishedAt)) / 86_400_000;
  if (Number.isNaN(days)) return 1;
  // Full weight inside a quarter, tapering to 0.9 over two years.
  return 1 + 0.1 * Math.max(0, 1 - Math.max(0, days - 90) / 640) - 0.05;
}

export function retrieve(q: RetrievalQuery): RetrievalResult {
  const t0 =
    typeof performance !== 'undefined' ? performance.now() : Date.now();
  const topK = q.topK ?? DEFAULT_TOP_K;
  const minScore = q.minScore ?? MIN_SCORE;

  const empty = (status: RetrievalResult['status'], note: string): RetrievalResult => ({
    status,
    query: q.query,
    expandedTerms: [],
    chunks: [],
    candidatesConsidered: 0,
    latencyMs: Math.round(
      (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0,
    ),
    note,
  });

  if (!isCorpusAvailable()) {
    return empty('CORPUS_UNAVAILABLE', 'Document corpus unavailable — no evidence retrieved.');
  }

  let index;
  let queryVector: Float32Array;
  let expandedTerms: string[];
  try {
    index = getIndex();
    // 1. normalise + expand   2. embed the query
    expandedTerms = index.embedder.terms(q.query, { expand: true });
    queryVector = index.embedder.embed(q.query, { expand: true });
  } catch (err) {
    return empty('EMBEDDING_FAILED', err instanceof Error ? err.message : 'Embedding failed.');
  }

  // 3. reject queries the corpus demonstrably cannot answer, before ranking.
  const ood = outOfDomainRatio(q.query, index.embedder);
  if (ood.ratio > MAX_OOD_RATIO) {
    return {
      ...empty('NO_RELEVANT_EVIDENCE', ''),
      expandedTerms,
      note: `Query is outside the indexed corpus — ${ood.unknown.length} of ${
        tokenize(q.query).length
      } terms (${ood.unknown.slice(0, 4).join(', ')}) do not appear in any indexed document.`,
    };
  }

  // 4. metadata filter + vector similarity, over-fetched for reranking.
  const candidates = index.store.search(queryVector, q.filter, topK * 6);

  const originalTerms = tokenize(q.query);
  const expandedOnly = expansionTerms(originalTerms);
  const queryTerms = new Set(originalTerms);
  const ranked: RetrievedChunk[] = candidates.map(({ chunk, similarity }) => {
    const chunkTerms = new Set(tokenize(chunk.text));
    const matchedTerms = [...queryTerms].filter((t) => chunkTerms.has(t));
    // 5. blend lexical and vector evidence, then apply metadata boosts.
    const lexical = squash(index.lexical.score(chunk, originalTerms, expandedOnly));
    const blended = LEXICAL_WEIGHT * lexical + (1 - LEXICAL_WEIGHT) * similarity;
    const score = blended * (TYPE_WEIGHT[chunk.documentType] ?? 1) * recencyBoost(chunk.publishedAt);
    return {
      chunkId: chunk.chunkId,
      documentId: chunk.documentId,
      text: chunk.text,
      similarity: Math.round(similarity * 1000) / 1000,
      score: Math.round(score * 1000) / 1000,
      company: chunk.company,
      ticker: chunk.ticker,
      documentType: chunk.documentType,
      source: chunk.source,
      sourceUrl: chunk.sourceUrl,
      publishedAt: chunk.publishedAt,
      page: chunk.page,
      section: chunk.section,
      synthetic: chunk.synthetic,
      matchedTerms,
    };
  });

  // 6. threshold  7. dedupe (one chunk per section)  8. rank
  const seen = new Set<string>();
  const chunks = ranked
    .filter((c) => c.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .filter((c) => {
      const key = `${c.documentId}::${c.section}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, topK);

  const latencyMs = Math.round(
    (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0,
  );

  if (chunks.length === 0) {
    return {
      status: 'NO_RELEVANT_EVIDENCE',
      query: q.query,
      expandedTerms,
      chunks: [],
      candidatesConsidered: candidates.length,
      latencyMs,
      note: `No chunk cleared the relevance threshold of ${minScore}.`,
    };
  }

  return {
    status: 'OK',
    query: q.query,
    expandedTerms,
    chunks,
    candidatesConsidered: candidates.length,
    latencyMs,
  };
}

/** A citation is only ever built from a chunk that came back from the store,
 *  so a fabricated reference is structurally impossible. */
export function toCitation(chunk: RetrievedChunk): Citation {
  const doc = getIndex().documents.get(chunk.documentId);
  // The heading is prefixed onto chunk text for retrieval purposes; strip it
  // from the excerpt so the citation does not repeat its own section name.
  const body = chunk.text.startsWith(`${chunk.section}.`)
    ? chunk.text.slice(chunk.section.length + 1).trim()
    : chunk.text;
  return {
    chunkId: chunk.chunkId,
    documentId: chunk.documentId,
    title: doc?.title ?? chunk.documentId,
    source: chunk.source,
    sourceUrl: chunk.sourceUrl,
    documentType: chunk.documentType,
    publishedAt: chunk.publishedAt,
    page: chunk.page,
    section: chunk.section,
    excerpt: body.length > 260 ? `${body.slice(0, 257)}…` : body,
    similarity: chunk.similarity,
    relevance: chunk.score,
    synthetic: chunk.synthetic,
  };
}

/** CONTEXT ASSEMBLY — every passage is labelled with the citation it came from,
 *  so an interpreting layer can attribute each claim it makes. */
export function buildContext(question: string, result: RetrievalResult): RAGContext {
  const citations = result.chunks.map(toCitation);
  const contextText =
    citations.length === 0
      ? ''
      : citations
          .map(
            (c, i) =>
              `[${i + 1}] ${c.title} — ${c.section} (p.${c.page}, ${c.publishedAt})\n${c.excerpt}`,
          )
          .join('\n\n');
  return { question, result, citations, contextText };
}

/** Query templates. Retrieval is driven by an actual natural-language question,
 *  not by a ticker lookup. */
export const QUESTION_TEMPLATES = {
  fundamentals: (company: string) =>
    `What does ${company}'s latest financial disclosure indicate about revenue growth, margins and capital efficiency?`,
  risks: (company: string) =>
    `What are the major business risks and risk factors disclosed by ${company}?`,
  margins: (company: string) => `What factors could negatively affect ${company}'s margins?`,
} as const;
