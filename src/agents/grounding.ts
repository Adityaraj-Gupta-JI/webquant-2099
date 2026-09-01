import type { Evidence } from '../types';
import type { Citation, RAGContext, RetrievedChunk } from '../rag/types';

/** ── Interpretation of retrieved passages ─────────────────────────────────────
 *  A deterministic keyword-polarity read over the retrieved text. It is a
 *  heuristic, and it is labelled as one everywhere it surfaces — it does not
 *  claim to be sentiment analysis or comprehension. Its job is to place a
 *  retrieved passage on a supports/contradicts axis so the graph can draw it.
 *
 *  Critically, the passage itself and its citation travel with the score, so a
 *  user can read the source and disagree with the reading.                    */

const NEGATIVE = [
  'risk', 'pressure', 'compress', 'decline', 'defer', 'weak', 'slow', 'headwind',
  'adverse', 'deteriorat', 'constrain', 'overrun', 'delay', 'attrition', 'inflation',
  'exceed', 'cyclical', 'unsecured', 'provision', 'concentrat', 'trimmed', 'softer',
  'below', 'loss', 'compression', 'outside management control', 'not hedge',
];
const POSITIVE = [
  'grew', 'growth', 'expand', 'ahead', 'raised', 'improv', 'strong', 'stable',
  'healthy', 'sustain', 'gain', 'outpaced', 'win', 'higher', 'upward', 'favourable',
  'headroom', 'eased', 'easing',
];

export interface PassageReading {
  polarity: number; // -1..1
  positiveHits: string[];
  negativeHits: string[];
}

export function readPassage(text: string): PassageReading {
  const lower = text.toLowerCase();
  const negativeHits = NEGATIVE.filter((w) => lower.includes(w));
  const positiveHits = POSITIVE.filter((w) => lower.includes(w));
  const total = positiveHits.length + negativeHits.length;
  // The +2 damping keeps a single keyword from producing a maximal reading.
  const polarity = total === 0 ? 0 : (positiveHits.length - negativeHits.length) / (total + 2);
  return { polarity, positiveHits, negativeHits };
}

/** Turn a retrieved chunk into evidence that carries its own citation. */
export function chunkToEvidence(chunk: RetrievedChunk, citation: Citation): Evidence {
  const reading = readPassage(chunk.text);
  return {
    id: `ev-doc-${chunk.chunkId}`,
    kind: 'document',
    label: chunk.section,
    value: `p.${chunk.page}`,
    detail: citation.excerpt,
    source: `${citation.title} — p.${citation.page}`,
    timestamp: chunk.publishedAt,
    origin: 'demo',
    polarity: reading.polarity,
    // Retrieval score sets how much a passage is allowed to move the reading.
    weight: Math.min(0.9, 0.3 + chunk.score),
    citation,
  };
}

export function groundedEvidence(rag: RAGContext): Evidence[] {
  return rag.result.chunks.map((chunk, i) => chunkToEvidence(chunk, rag.citations[i]));
}

/** Sentences a grounded agent may state, separated into what the document says
 *  and what the agent infers from it. */
export function groundedReasoning(rag: RAGContext): string[] {
  if (rag.result.status !== 'OK' || rag.citations.length === 0) {
    return [
      `RETRIEVED: nothing. ${rag.result.note ?? 'No passage cleared the relevance threshold.'}`,
      'INTERPRETATION: no document-grounded claim is made, and no citation is offered.',
    ];
  }
  const lines: string[] = [];
  for (const [i, c] of rag.citations.entries()) {
    const reading = readPassage(rag.result.chunks[i].text);
    const direction =
      reading.polarity > 0.05 ? 'supportive' : reading.polarity < -0.05 ? 'cautionary' : 'neutral';
    lines.push(
      `RETRIEVED [${i + 1}] ${c.title}, "${c.section}" p.${c.page} (${c.publishedAt}) — read as ${direction}.`,
    );
  }
  lines.push(
    `INTERPRETATION: ${rag.citations.length} passage(s) retrieved from ${
      new Set(rag.citations.map((c) => c.documentId)).size
    } document(s); polarity is a keyword heuristic over the retrieved text, not a claim of comprehension.`,
  );
  return lines;
}
