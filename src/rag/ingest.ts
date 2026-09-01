import { chunkDocument } from './chunker';
import { LocalLexicalEmbedding, type EmbeddingProvider } from './embeddings';
import { CORPUS } from './corpus';
import { buildLexicalIndex, type LexicalIndex } from './lexical';
import { InMemoryVectorStore, type VectorStore } from './vectorStore';
import type { SourceDocument, StoredChunk } from './types';

/** SOURCE → PARSE → CLEAN → CHUNK → METADATA → EMBED → UPSERT */

export interface IngestionStats {
  documentsProcessed: number;
  chunksCreated: number;
  chunksSkipped: number;
  embeddingsGenerated: number;
  errors: string[];
  durationMs: number;
  embeddingProvider: string;
  vectorStore: string;
}

export interface RagIndex {
  store: VectorStore;
  embedder: EmbeddingProvider;
  lexical: LexicalIndex;
  chunks: StoredChunk[];
  documents: Map<string, SourceDocument>;
  stats: IngestionStats;
}

export function ingest(
  documents: SourceDocument[] = CORPUS,
  store: VectorStore = new InMemoryVectorStore(),
  embedder: EmbeddingProvider = new LocalLexicalEmbedding(),
): RagIndex {
  const t0 = Date.now();
  const errors: string[] = [];
  const byId = new Map<string, SourceDocument>();
  const allChunks = [];
  let skipped = 0;

  for (const doc of documents) {
    try {
      if (byId.has(doc.documentId)) {
        errors.push(`Duplicate documentId skipped: ${doc.documentId}`);
        continue;
      }
      const chunks = chunkDocument(doc);
      // Guard against empty or whitespace-only sections producing dead chunks.
      const usable = chunks.filter((c) => c.text.trim().length > 40);
      skipped += chunks.length - usable.length;
      byId.set(doc.documentId, doc);
      allChunks.push(...usable);
    } catch (err) {
      errors.push(`${doc.documentId}: ${err instanceof Error ? err.message : 'parse failed'}`);
    }
  }

  // IDF must be learned across the whole corpus before any vector is produced.
  embedder.fit(allChunks.map((c) => c.text));

  const stored: StoredChunk[] = [];
  for (const chunk of allChunks) {
    try {
      stored.push({ ...chunk, embedding: embedder.embed(chunk.text) });
    } catch (err) {
      errors.push(`${chunk.chunkId}: ${err instanceof Error ? err.message : 'embed failed'}`);
    }
  }
  store.upsert(stored);

  return {
    store,
    embedder,
    lexical: buildLexicalIndex(stored, embedder),
    chunks: stored,
    documents: byId,
    stats: {
      documentsProcessed: byId.size,
      chunksCreated: stored.length,
      chunksSkipped: skipped,
      embeddingsGenerated: stored.length,
      errors,
      durationMs: Date.now() - t0,
      embeddingProvider: embedder.id,
      vectorStore: store.id,
    },
  };
}

/** Built once per session and reused. Cheap enough to be synchronous. */
let cached: RagIndex | null = null;

export function getIndex(): RagIndex {
  if (!cached) cached = ingest();
  return cached;
}

/** Degraded-data demo: simulate the corpus being unreachable. */
let corpusDisabled = false;
export const setCorpusAvailable = (available: boolean) => {
  corpusDisabled = !available;
};
export const isCorpusAvailable = () => !corpusDisabled;
