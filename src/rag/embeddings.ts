import { expansionTerms, hash32, tokenize } from './text';

/** ────────────────────────────────────────────────────────────────────────────
 *  EMBEDDINGS
 *
 *  HONEST LABEL: this is a **local lexical-semantic index**, not a neural
 *  embedding model. This application ships no server and no credentials, so
 *  calling a hosted embedding API is not available to it.
 *
 *  What it actually does: TF-IDF weighted term vectors projected into a fixed
 *  dimensional space by the hashing trick, with a finance concept lexicon for
 *  query expansion. That yields real vector similarity search with genuine
 *  above-keyword recall ("business risks" reaches "Risk Factors"), while being
 *  fully deterministic and inspectable.
 *
 *  It is NOT a substitute for a sentence transformer. Swap in a real model by
 *  implementing this interface — nothing downstream changes.
 *  ──────────────────────────────────────────────────────────────────────────── */

export interface EmbeddingProvider {
  readonly id: string;
  readonly dimensions: number;
  /** Learn corpus statistics (IDF). Required before embedding. */
  fit(documents: string[]): void;
  embed(text: string, opts?: { expand?: boolean }): Float32Array;
  /** Terms the text contributed, for match explanation. */
  terms(text: string, opts?: { expand?: boolean }): string[];
  /** Corpus statistics, needed for lexical scoring and out-of-domain checks. */
  idfOf(term: string): number;
  inVocabulary(term: string): boolean;
  readonly vocabularySize: number;
}

const DIMENSIONS = 384;
/** Each term writes to two dimensions with independent signs — standard
 *  signed hashing, which keeps collisions from biasing in one direction. */
const HASHES_PER_TERM = 2;
/** A synonym is weaker evidence than the word the user typed. Weighting
 *  expansion at full strength swamps a short query with its own thesaurus —
 *  measured as the main cause of recall failure before this was added. */
const EXPANSION_WEIGHT = 0.35;

export class LocalLexicalEmbedding implements EmbeddingProvider {
  readonly id = 'local-tfidf-hashed-v1';
  readonly dimensions = DIMENSIONS;
  private idf = new Map<string, number>();
  private fitted = false;

  fit(documents: string[]): void {
    const df = new Map<string, number>();
    for (const doc of documents) {
      for (const term of new Set(tokenize(doc))) {
        df.set(term, (df.get(term) ?? 0) + 1);
      }
    }
    const n = documents.length;
    this.idf.clear();
    for (const [term, count] of df) {
      // Smoothed IDF — rare terms carry the discriminative weight.
      this.idf.set(term, Math.log((n + 1) / (count + 0.5)) + 1);
    }
    this.fitted = true;
  }

  /** Unseen terms are still informative; treat them as maximally rare. */
  idfOf(term: string): number {
    return this.idf.get(term) ?? Math.log(this.idf.size + 1) + 1;
  }

  inVocabulary(term: string): boolean {
    return this.idf.has(term);
  }

  get vocabularySize(): number {
    return this.idf.size;
  }

  terms(text: string, opts: { expand?: boolean } = {}): string[] {
    const base = tokenize(text);
    return opts.expand ? [...base, ...expansionTerms(base)] : base;
  }

  embed(text: string, opts: { expand?: boolean } = {}): Float32Array {
    if (!this.fitted) throw new Error('EmbeddingProvider.fit() must run before embed().');
    const base = tokenize(text);
    const vector = new Float32Array(DIMENSIONS);
    if (base.length === 0) return vector;

    const tf = new Map<string, number>();
    for (const t of base) tf.set(t, (tf.get(t) ?? 0) + 1);
    const boost = new Map<string, number>();
    for (const [t, c] of tf) boost.set(t, c);
    if (opts.expand) {
      for (const t of expansionTerms(base)) {
        if (!boost.has(t)) boost.set(t, EXPANSION_WEIGHT);
      }
    }

    for (const [term, count] of boost) {
      // Sublinear TF damps repetition, as in standard TF-IDF.
      const weight = (1 + Math.log(Math.max(count, 1))) * this.idfOf(term) *
        (count < 1 ? count : 1);
      for (let k = 0; k < HASHES_PER_TERM; k++) {
        const h = hash32(term, 0x9e3779b9 + k * 0x85ebca6b);
        const dim = h % DIMENSIONS;
        const sign = (h >>> 31) & 1 ? -1 : 1;
        vector[dim] += sign * weight;
      }
    }

    // L2 normalise so the dot product is exactly cosine similarity.
    let norm = 0;
    for (let i = 0; i < DIMENSIONS; i++) norm += vector[i] * vector[i];
    norm = Math.sqrt(norm);
    if (norm > 0) for (let i = 0; i < DIMENSIONS; i++) vector[i] /= norm;
    return vector;
  }
}

/** Cosine similarity of two L2-normalised vectors. */
export function cosine(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}
