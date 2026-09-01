import type { AgentResult, Evidence, RiskFactor } from '../types';
import { getIndex } from '../rag/ingest';
import { groundedEvidence, groundedReasoning, readPassage } from './grounding';
import {
  confidenceFrom,
  stanceFor,
  type AgentContext,
  type FinancialAgent,
} from './shared';

/** "What does the company's latest financial disclosure indicate about its
 *  fundamentals and risks?"
 *
 *  This is the retrieval-grounded agent. It reads two kinds of input and keeps
 *  them distinct: structured reported financials, and passages retrieved from
 *  the document corpus. Every claim originating in a document carries the
 *  citation for that document — and when retrieval returns nothing, the agent
 *  says so and cites nothing rather than reaching for a plausible sentence. */
export const fundamentalAgent: FinancialAgent = {
  id: 'fundamental',
  name: 'Fundamental Analysis',
  question: "What does the company's financial health indicate?",
  async run(ctx: AgentContext): Promise<AgentResult> {
    const t0 = performance.now();
    const f = ctx.asset.fundamentals;
    const s = ctx.quant.signal;
    const asOf = ctx.asset.candles[ctx.asset.candles.length - 1].t;
    const mk = (
      id: string,
      label: string,
      value: string,
      detail: string,
      polarity: number,
      weight: number,
    ): Evidence => ({
      id,
      kind: 'fundamental',
      label,
      value,
      detail,
      source: 'Reported financials',
      timestamp: asOf,
      origin: ctx.asset.origin,
      polarity,
      weight,
    });

    const pePremium = ((f.peRatio - f.sectorPe) / f.sectorPe) * 100;
    const evidence: Evidence[] = [
      mk(
        'ev-fun-rev',
        'Revenue growth (YoY)',
        `${f.revenueGrowthYoY}%`,
        `Top line expanding ${f.revenueGrowthYoY}% year on year.`,
        Math.max(-1, Math.min(1, (f.revenueGrowthYoY - 6) / 10)),
        0.75,
      ),
      mk(
        'ev-fun-eps',
        'EPS growth (YoY)',
        `${f.epsGrowthYoY}%`,
        `Earnings per share growing ${f.epsGrowthYoY}% — ${
          f.epsGrowthYoY > f.revenueGrowthYoY ? 'operating leverage is positive' : 'margins are diluting growth'
        }.`,
        Math.max(-1, Math.min(1, (f.epsGrowthYoY - 8) / 12)),
        0.7,
      ),
      mk(
        'ev-fun-pe',
        'P/E vs sector',
        `${f.peRatio} / ${f.sectorPe}`,
        `Trading at a ${pePremium >= 0 ? 'premium' : 'discount'} of ${Math.abs(
          Math.round(pePremium),
        )}% to the sector multiple.`,
        -Math.max(-1, Math.min(1, pePremium / 30)),
        0.65,
      ),
      mk(
        'ev-fun-roe',
        'Return on equity',
        `${f.roe}%`,
        `Capital efficiency at ${f.roe}% ROE.`,
        Math.max(-1, Math.min(1, (f.roe - 14) / 15)),
        0.6,
      ),
      mk(
        'ev-fun-de',
        'Debt / equity',
        `${f.debtToEquity}`,
        `Balance-sheet leverage at ${f.debtToEquity}x equity.`,
        -Math.max(-1, Math.min(1, (f.debtToEquity - 0.5) / 0.9)),
        0.55,
      ),
    ];

    const risks: RiskFactor[] = [];
    if (pePremium > 12) {
      risks.push({
        id: 'rk-fun-val',
        category: 'valuation',
        label: 'Valuation premium to sector',
        detail: `A ${Math.round(pePremium)}% premium prices in execution that has not yet been delivered.`,
        severity: Math.min(88, 40 + Math.round(pePremium)),
      });
    }
    if (f.debtToEquity > 1) {
      risks.push({
        id: 'rk-fun-lev',
        category: 'exposure',
        label: 'Elevated leverage',
        detail: `Debt/equity of ${f.debtToEquity}x raises sensitivity to the rate cycle.`,
        severity: Math.min(85, Math.round(f.debtToEquity * 50)),
      });
    }

    // ── Document-grounded evidence ────────────────────────────────────────
    const rag = ctx.rag;
    const docEvidence = rag ? groundedEvidence(rag) : [];
    evidence.push(...docEvidence);

    // Disclosed risk factors become real risks, attributed to their source.
    if (rag?.result.status === 'OK') {
      for (const [i, chunk] of rag.result.chunks.entries()) {
        const reading = readPassage(chunk.text);
        if (reading.polarity >= -0.05) continue;
        const citation = rag.citations[i];
        risks.push({
          id: `rk-doc-${chunk.chunkId}`,
          category: chunk.section.toLowerCase().includes('margin') ? 'valuation' : 'event',
          label: chunk.section,
          detail: `${citation.excerpt.slice(0, 180)}… [${citation.title}, p.${citation.page}]`,
          severity: Math.min(80, Math.round(Math.abs(reading.polarity) * 100 + chunk.score * 40)),
        });
      }
    }

    // Retrieved passages shift the structured read, bounded so a document can
    // qualify the numbers but never override them.
    const docTotal = docEvidence.reduce((a, e) => a + e.weight, 0);
    const docNet = docEvidence.reduce((a, e) => a + e.polarity * e.weight, 0);
    const docTilt = docTotal === 0 ? 0 : (docNet / docTotal) * 12;

    const base = s.fundamentalScore * 0.7 + s.valuationScore * 0.3;
    const signal = Math.round(Math.max(5, Math.min(95, base + docTilt)));
    return {
      agentId: 'fundamental',
      name: fundamentalAgent.name,
      question: fundamentalAgent.question,
      stance: stanceFor(signal),
      signal,
      // Retrieval failure lowers confidence — it never silently passes through.
      confidence:
        rag && rag.result.status !== 'OK'
          ? Math.min(confidenceFrom(evidence), 0.55)
          : confidenceFrom(evidence),
      evidence,
      risks,
      reasoning: [
        `Fundamental score ${s.fundamentalScore}/100 from growth, ROE and leverage (reported financials).`,
        `Valuation score ${s.valuationScore}/100 from the sector-relative multiple.`,
        ...(rag
          ? groundedReasoning(rag)
          : ['RETRIEVED: retrieval was not run for this analysis.']),
        docTilt !== 0
          ? `Retrieved documents adjust the structured read by ${docTilt >= 0 ? '+' : ''}${docTilt.toFixed(1)} points, capped at ±12.`
          : 'Retrieved documents did not move the structured read.',
      ],
      citations: rag?.citations ?? [],
      retrieval: rag
        ? {
            status: rag.result.status,
            chunksRetrieved: rag.result.chunks.length,
            candidatesConsidered: rag.result.candidatesConsidered,
            topSimilarity: rag.result.chunks[0]?.similarity ?? 0,
            latencyMs: rag.result.latencyMs,
            embeddingProvider: getIndex().embedder.id,
            vectorStore: getIndex().store.id,
            corpusChunks: getIndex().store.count(),
          }
        : undefined,
      origin: ctx.asset.origin,
      durationMs: Math.round(performance.now() - t0),
    };
  },
};
