import type { AgentResult, RiskFactor } from '../types';
import {
  confidenceFrom,
  stanceFor,
  type AgentContext,
  type FinancialAgent,
} from './shared';

/** "What external information may affect the thesis?"
 *  Retrieved documents are treated as untrusted data — only extracted fields
 *  are carried forward, never raw markup or embedded instructions. */
export const newsAgent: FinancialAgent = {
  id: 'news',
  name: 'News & Sentiment',
  question: 'What external information may affect the thesis?',
  async run(ctx: AgentContext): Promise<AgentResult> {
    const t0 = performance.now();
    const evidence = ctx.news;

    const total = evidence.reduce((a, e) => a + e.weight, 0);
    const net = evidence.reduce((a, e) => a + e.polarity * e.weight, 0);
    const sentiment = total === 0 ? 0 : net / total; // -1..1
    const signal = Math.round(50 + sentiment * 42);

    const risks: RiskFactor[] = evidence
      .filter((e) => e.polarity <= -0.4)
      .map((e) => ({
        id: `rk-news-${e.id}`,
        category: 'event' as const,
        label: e.label,
        detail: e.detail,
        severity: Math.round(Math.abs(e.polarity) * e.weight * 100),
      }));

    return {
      agentId: 'news',
      name: newsAgent.name,
      question: newsAgent.question,
      stance: evidence.length === 0 ? 'watch' : stanceFor(signal),
      signal,
      confidence: evidence.length === 0 ? 0.3 : confidenceFrom(evidence),
      evidence,
      risks,
      reasoning: [
        `${evidence.length} retrieved items scored on entity match, recency and source quality.`,
        `Weighted sentiment ${sentiment >= 0 ? '+' : ''}${(sentiment * 100).toFixed(0)} on a −100…+100 scale.`,
        risks.length
          ? `${risks.length} item(s) carry material downside implications.`
          : 'No retrieved item carries material downside implications.',
      ],
      origin: evidence[0]?.origin ?? ctx.asset.origin,
      durationMs: Math.round(performance.now() - t0),
    };
  },
};
