import { getIndex } from './ingest';
import { retrieve } from './retriever';
import type { DocumentType } from './types';

/** ── RAG evaluation ───────────────────────────────────────────────────────────
 *  A fixed, deterministic question set with expected targets. These numbers
 *  describe THIS 23-chunk synthetic corpus only. They are not a claim about
 *  production retrieval performance and must not be presented as one.        */

export interface EvalCase {
  id: string;
  question: string;
  ticker?: string;
  /** A hit requires the retrieved chunk to come from one of these documents. */
  expectedDocumentTypes?: DocumentType[];
  /** Case-insensitive fragment expected in the matched section heading. */
  expectedSection?: string;
  /** Adversarial: the corpus cannot answer this, so no evidence is correct. */
  expectNoEvidence?: boolean;
}

export const EVAL_SET: EvalCase[] = [
  { id: 'e01', question: "What are the company's major business risks?", ticker: 'TCS', expectedSection: 'Risk Factors' },
  { id: 'e02', question: 'What did the latest annual report say about revenue growth?', ticker: 'INFY', expectedSection: 'Growth' },
  { id: 'e03', question: 'What factors could negatively affect margins?', ticker: 'HDFCBANK', expectedSection: 'Margin' },
  { id: 'e04', question: "What are the company's major risk disclosures?", ticker: 'RELIANCE', expectedSection: 'Disclosure' },
  { id: 'e05', question: 'What capital expenditure commitments has the company made?', ticker: 'RELIANCE', expectedSection: 'Capital' },
  { id: 'e06', question: 'How is deposit growth affecting funding cost?', ticker: 'HDFCBANK', expectedSection: 'Margin and Funding' },
  { id: 'e07', question: 'What is the exposure to refining spreads and crude?', ticker: 'RELIANCE', expectedSection: 'Commodity' },
  { id: 'e08', question: 'Is attrition a risk to delivery and margins?', ticker: 'INFY', expectedSection: 'Attrition' },
  { id: 'e09', question: 'What did management guide on discretionary client spending?', ticker: 'TCS', expectedSection: 'Discretionary' },
  { id: 'e10', question: 'What is the return on equity and capital efficiency?', ticker: 'TCS', expectedSection: 'Capital Efficiency' },
  { id: 'e11', question: 'What currency and wage inflation risks are disclosed?', ticker: 'TCS', expectedSection: 'Currency' },
  { id: 'e12', question: 'What is the credit and concentration risk in the loan book?', ticker: 'HDFCBANK', expectedSection: 'Credit' },
  { id: 'e13', question: 'What guidance was given on refining margins?', ticker: 'RELIANCE', expectedDocumentTypes: ['quarterly_result'] },
  { id: 'e14', question: 'What client contract clauses reduce billed revenue?', ticker: 'INFY', expectedSection: 'Client and Contract' },
  // ── adversarial: unsupported by the corpus ──
  { id: 'a01', question: 'What will the share price be in 2027?', ticker: 'TCS', expectNoEvidence: true },
  { id: 'a02', question: 'The CEO announced a merger with a European bank', ticker: 'INFY', expectNoEvidence: true },
  { id: 'a03', question: 'quantum computing division revenue', ticker: 'RELIANCE', expectNoEvidence: true },
  { id: 'a04', question: 'What penalty did the regulator impose for insider trading?', ticker: 'HDFCBANK', expectNoEvidence: true },
  { id: 'a05', question: 'How many employees were laid off in the restructuring?', ticker: 'TCS', expectNoEvidence: true },
];

export interface EvalReport {
  total: number;
  grounded: number;
  adversarial: number;
  hitAt1: number;
  hitAt3: number;
  mrr: number;
  citationCoverage: number;
  noEvidenceHandled: number;
  falsePositives: number;
  corpusChunks: number;
  cases: {
    id: string;
    question: string;
    passed: boolean;
    rank: number | null;
    status: string;
    top: string;
  }[];
}

const K = 3;

function isHit(c: EvalCase, section: string, documentType: DocumentType): boolean {
  if (c.expectedSection && !section.toLowerCase().includes(c.expectedSection.toLowerCase())) {
    return false;
  }
  if (c.expectedDocumentTypes && !c.expectedDocumentTypes.includes(documentType)) return false;
  return true;
}

export function runEvaluation(): EvalReport {
  const cases: EvalReport['cases'] = [];
  let hit1 = 0;
  let hit3 = 0;
  let rr = 0;
  let cited = 0;
  let grounded = 0;
  let adversarial = 0;
  let handled = 0;
  let falsePositives = 0;

  for (const c of EVAL_SET) {
    const result = retrieve({
      query: c.question,
      filter: c.ticker ? { ticker: c.ticker } : undefined,
      topK: K,
    });

    if (c.expectNoEvidence) {
      adversarial++;
      const ok = result.status === 'NO_RELEVANT_EVIDENCE';
      if (ok) handled++;
      else falsePositives++;
      cases.push({
        id: c.id,
        question: c.question,
        passed: ok,
        rank: null,
        status: result.status,
        top: result.chunks[0]?.section ?? '—',
      });
      continue;
    }

    grounded++;
    const rank = result.chunks.findIndex((ch) => isHit(c, ch.section, ch.documentType));
    if (rank === 0) hit1++;
    if (rank >= 0 && rank < K) hit3++;
    if (rank >= 0) rr += 1 / (rank + 1);
    if (result.chunks.length > 0) cited++;
    cases.push({
      id: c.id,
      question: c.question,
      passed: rank >= 0 && rank < K,
      rank: rank >= 0 ? rank + 1 : null,
      status: result.status,
      top: result.chunks[0]?.section ?? '—',
    });
  }

  return {
    total: EVAL_SET.length,
    grounded,
    adversarial,
    hitAt1: grounded ? Math.round((hit1 / grounded) * 1000) / 10 : 0,
    hitAt3: grounded ? Math.round((hit3 / grounded) * 1000) / 10 : 0,
    mrr: grounded ? Math.round((rr / grounded) * 1000) / 1000 : 0,
    citationCoverage: grounded ? Math.round((cited / grounded) * 1000) / 10 : 0,
    noEvidenceHandled: adversarial ? Math.round((handled / adversarial) * 1000) / 10 : 0,
    falsePositives,
    corpusChunks: getIndex().store.count(),
    cases,
  };
}
