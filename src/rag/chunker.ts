import type { DocumentChunk, SourceDocument } from './types';

/** Target chunk size in words. Financial disclosure sections are short and
 *  self-contained, so a section is usually one chunk; long sections are split
 *  at sentence boundaries with overlap, never mid-sentence. */
const TARGET_WORDS = 130;
const OVERLAP_WORDS = 30;

/** Collapse whitespace and stray artefacts without altering meaning. */
export function clean(text: string): string {
  return text.replace(/\s+/g, ' ').replace(/\s([.,;:])/g, '$1').trim();
}

/**
 * Sentence split by scan, not by `String.match`.
 *
 * A match-and-reassemble regex silently DROPS any text it fails to match. With
 * decimals in the source ("debt to equity of 1.14 times", "reported at 16.9%")
 * the sentence pattern failed to anchor and the leading clause vanished from the
 * chunk — which meant a citation could misquote its own source document. For a
 * retrieval system that is a correctness bug, not a formatting one.
 *
 * This scan is total: every character of the input appears in exactly one part.
 */
function splitSentences(text: string): string[] {
  const out: string[] = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch !== '.' && ch !== '!' && ch !== '?') continue;
    const next = text[i + 1];
    // A period bounded by digits is a decimal, not a sentence end.
    if (next !== undefined && !/\s/.test(next)) continue;
    const part = text.slice(start, i + 1).trim();
    if (part) out.push(part);
    start = i + 1;
  }
  const tail = text.slice(start).trim();
  if (tail) out.push(tail);
  return out.length ? out : [text];
}

/** Section-aware chunking: page and heading survive into every chunk, because
 *  those two fields are what make a citation checkable. */
export function chunkDocument(doc: SourceDocument): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  let index = 0;

  for (const section of doc.sections) {
    const body = clean(section.body);
    const sentences = splitSentences(body);
    const parts: string[] = [];
    let current: string[] = [];
    let count = 0;

    for (const sentence of sentences) {
      const words = sentence.split(' ').length;
      if (count + words > TARGET_WORDS && current.length > 0) {
        parts.push(current.join(' '));
        // Carry the tail of the previous chunk forward as overlap.
        const tail: string[] = [];
        let carried = 0;
        for (let i = current.length - 1; i >= 0 && carried < OVERLAP_WORDS; i--) {
          tail.unshift(current[i]);
          carried += current[i].split(' ').length;
        }
        current = tail;
        count = carried;
      }
      current.push(sentence);
      count += words;
    }
    if (current.length) parts.push(current.join(' '));

    // Guard: the chunker must never lose source text. Overlap means chunks are
    // longer than the section, never shorter — but every source word must appear.
    if (import.meta.env.DEV) {
      const sourceWords = body.split(' ').filter(Boolean);
      const covered = parts.join(' ');
      const missing = sourceWords.filter((w) => !covered.includes(w));
      if (missing.length) {
        // eslint-disable-next-line no-console
        console.error(
          `[chunker] dropped ${missing.length} token(s) from ${doc.documentId} p.${section.page}:`,
          missing.slice(0, 5),
        );
      }
    }

    parts.forEach((text, i) => {
      chunks.push({
        // Deterministic id — re-ingesting the same corpus is a no-op.
        chunkId: `${doc.documentId}_p${section.page}_c${String(i).padStart(2, '0')}`,
        documentId: doc.documentId,
        chunkIndex: index++,
        text: `${section.heading}. ${text}`,
        company: doc.company,
        ticker: doc.ticker,
        documentType: doc.documentType,
        source: doc.source,
        sourceUrl: doc.sourceUrl,
        publishedAt: doc.publishedAt,
        page: section.page,
        section: section.heading,
        synthetic: doc.synthetic,
      });
    });
  }

  return chunks;
}
