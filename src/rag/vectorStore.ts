import { cosine } from './embeddings';
import type { MetadataFilter, StoredChunk } from './types';

/** Storage abstraction. The in-browser implementation ships; a pgvector- or
 *  Qdrant-backed one can replace it without touching retrieval or agents. */
export interface VectorStore {
  readonly id: string;
  upsert(chunks: StoredChunk[]): void;
  /** Similarity search restricted to chunks passing the metadata filter. */
  search(
    vector: Float32Array,
    filter: MetadataFilter | undefined,
    topK: number,
  ): { chunk: StoredChunk; similarity: number }[];
  get(chunkId: string): StoredChunk | undefined;
  count(): number;
  clear(): void;
}

export function matchesFilter(chunk: StoredChunk, f?: MetadataFilter): boolean {
  if (!f) return true;
  if (f.ticker && chunk.ticker !== f.ticker.toUpperCase()) return false;
  if (f.company && chunk.company !== f.company) return false;
  if (f.documentId && chunk.documentId !== f.documentId) return false;
  if (f.documentType) {
    const types = Array.isArray(f.documentType) ? f.documentType : [f.documentType];
    if (!types.includes(chunk.documentType)) return false;
  }
  if (f.publishedAfter && chunk.publishedAt < f.publishedAfter) return false;
  if (f.publishedBefore && chunk.publishedAt > f.publishedBefore) return false;
  return true;
}

/**
 * Exhaustive cosine scan over the filtered set.
 *
 * Deliberate choice: the corpus is ~60 chunks, so an exact scan is both faster
 * and more accurate than an approximate index. An ANN index (HNSW/IVFFlat) only
 * pays off at a scale this prototype does not have — adding one here would be
 * infrastructure for its own sake. The interface leaves that door open.
 */
export class InMemoryVectorStore implements VectorStore {
  readonly id = 'in-memory-cosine-v1';
  private chunks = new Map<string, StoredChunk>();

  upsert(chunks: StoredChunk[]): void {
    // Deterministic chunk ids make this idempotent — re-ingest is a no-op.
    for (const c of chunks) this.chunks.set(c.chunkId, c);
  }

  search(vector: Float32Array, filter: MetadataFilter | undefined, topK: number) {
    const scored: { chunk: StoredChunk; similarity: number }[] = [];
    for (const chunk of this.chunks.values()) {
      if (!matchesFilter(chunk, filter)) continue;
      scored.push({ chunk, similarity: cosine(vector, chunk.embedding) });
    }
    scored.sort((a, b) => b.similarity - a.similarity);
    return scored.slice(0, topK);
  }

  get(chunkId: string) {
    return this.chunks.get(chunkId);
  }
  count() {
    return this.chunks.size;
  }
  clear() {
    this.chunks.clear();
  }
}
