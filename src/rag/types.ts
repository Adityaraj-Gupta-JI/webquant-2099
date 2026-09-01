// ── RAG domain contracts ─────────────────────────────────────────────────────
// Storage-agnostic: an implementation backed by pgvector/Qdrant can replace the
// in-browser one without any agent or UI change.

export type DocumentType =
  | 'annual_report'
  | 'quarterly_result'
  | 'regulatory_disclosure'
  | 'earnings_transcript';

export interface SourceDocument {
  documentId: string;
  title: string;
  company: string;
  ticker: string;
  documentType: DocumentType;
  source: string;
  sourceUrl: string;
  publishedAt: string; // ISO date
  /** Clearly-labelled synthetic corpus for the prototype. */
  synthetic: boolean;
  sections: DocumentSection[];
}

export interface DocumentSection {
  heading: string;
  page: number;
  body: string;
}

export interface DocumentChunk {
  chunkId: string;
  documentId: string;
  chunkIndex: number;
  text: string;
  // ── metadata carried for filtering and, crucially, for citation ──
  company: string;
  ticker: string;
  documentType: DocumentType;
  source: string;
  sourceUrl: string;
  publishedAt: string;
  page: number;
  section: string;
  synthetic: boolean;
}

export interface StoredChunk extends DocumentChunk {
  embedding: Float32Array;
}

export interface MetadataFilter {
  ticker?: string;
  company?: string;
  documentType?: DocumentType | DocumentType[];
  publishedAfter?: string;
  publishedBefore?: string;
  documentId?: string;
}

export interface RetrievalQuery {
  query: string;
  filter?: MetadataFilter;
  topK?: number;
  /** Chunks scoring below this are discarded rather than padded out. */
  minScore?: number;
}

export interface RetrievedChunk {
  chunkId: string;
  documentId: string;
  text: string;
  /** Cosine similarity of the query and chunk vectors, 0..1. */
  similarity: number;
  /** Similarity after metadata boosts. Ranking uses this. */
  score: number;
  company: string;
  ticker: string;
  documentType: DocumentType;
  source: string;
  sourceUrl: string;
  publishedAt: string;
  page: number;
  section: string;
  synthetic: boolean;
  /** Query terms actually present in the chunk — shown to the user so a match
   *  can be judged, not merely trusted. */
  matchedTerms: string[];
}

export type RetrievalStatus =
  | 'OK'
  | 'NO_RELEVANT_EVIDENCE'
  | 'CORPUS_UNAVAILABLE'
  | 'EMBEDDING_FAILED';

export interface RetrievalResult {
  status: RetrievalStatus;
  query: string;
  expandedTerms: string[];
  chunks: RetrievedChunk[];
  /** Candidates considered before the threshold cut. */
  candidatesConsidered: number;
  latencyMs: number;
  note?: string;
}

/** A citation always points at a chunk that genuinely exists in the store. */
export interface Citation {
  chunkId: string;
  documentId: string;
  title: string;
  source: string;
  sourceUrl: string;
  documentType: DocumentType;
  publishedAt: string;
  page: number;
  section: string;
  excerpt: string;
  /** Raw cosine of the query and chunk vectors. */
  similarity: number;
  /** Blended lexical+vector score after metadata boosts — what ranking used. */
  relevance: number;
  synthetic: boolean;
}

export interface RAGContext {
  question: string;
  result: RetrievalResult;
  citations: Citation[];
  /** Assembled context passed to the interpreting layer. */
  contextText: string;
}

export interface RetrievalMetadata {
  status: RetrievalStatus;
  chunksRetrieved: number;
  candidatesConsidered: number;
  topSimilarity: number;
  latencyMs: number;
  embeddingProvider: string;
  vectorStore: string;
  corpusChunks: number;
}
