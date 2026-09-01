import type { EmbeddingProvider } from './embeddings';
import { expansionTerms, tokenize } from './text';
import type { StoredChunk } from './types';

/** ── BM25 ─────────────────────────────────────────────────────────────────────
 *  Vector cosine alone underperforms on short queries against short chunks:
 *  the hashing trick spreads a 3-term query thinly and length normalisation is
 *  crude. BM25 handles both directly, so retrieval blends the two rather than
 *  trusting either.                                                            */

const K1 = 1.2;
const B = 0.75;
/** Expansion terms score, but at reduced weight — same rationale as embeddings. */
const EXPANSION_WEIGHT = 0.35;

export interface LexicalIndex {
  score(chunk: StoredChunk, queryTerms: string[], expanded: string[]): number;
  avgLength: number;
}

export function buildLexicalIndex(
  chunks: StoredChunk[],
  embedder: EmbeddingProvider,
): LexicalIndex {
  const tokensByChunk = new Map<string, Map<string, number>>();
  const lengths = new Map<string, number>();
  let total = 0;

  for (const c of chunks) {
    const tokens = tokenize(c.text);
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    tokensByChunk.set(c.chunkId, tf);
    lengths.set(c.chunkId, tokens.length);
    total += tokens.length;
  }
  const avgLength = chunks.length ? total / chunks.length : 1;

  return {
    avgLength,
    score(chunk, queryTerms, expanded) {
      const tf = tokensByChunk.get(chunk.chunkId);
      if (!tf) return 0;
      const len = lengths.get(chunk.chunkId) ?? avgLength;
      let score = 0;
      const seen = new Set<string>();
      const accumulate = (term: string, weight: number) => {
        if (seen.has(term)) return;
        seen.add(term);
        const f = tf.get(term);
        if (!f) return;
        const idf = embedder.idfOf(term);
        score += weight * idf * ((f * (K1 + 1)) / (f + K1 * (1 - B + B * (len / avgLength))));
      };
      for (const t of queryTerms) accumulate(t, 1);
      for (const t of expanded) accumulate(t, EXPANSION_WEIGHT);
      return score;
    },
  };
}

/** Squash an unbounded BM25 score onto 0..1 so it can blend with cosine. */
export const squash = (score: number, k = 6): number => score / (score + k);

/**
 * Out-of-domain detection.
 *
 * A query about something the corpus simply does not contain ("quantum
 * computing division revenue") will still find weak term overlap on its one
 * common word and squeak past a similarity threshold. Measuring how much of the
 * query is vocabulary the corpus has never seen catches it directly, and is
 * explainable to a user in a way a tuned threshold is not.
 */
export function outOfDomainRatio(query: string, embedder: EmbeddingProvider): {
  ratio: number;
  unknown: string[];
} {
  const terms = tokenize(query);
  if (terms.length === 0) return { ratio: 1, unknown: [] };
  const unknown = terms.filter((t) => !embedder.inVocabulary(t));
  return { ratio: unknown.length / terms.length, unknown };
}

export { expansionTerms, tokenize };
