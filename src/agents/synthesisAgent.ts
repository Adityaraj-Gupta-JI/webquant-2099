import type { AgentResult, Divergence, Evidence, RiskFactor } from '../types';
import { STANCE_LABEL, stanceFor, type AgentContext, type FinancialAgent } from './shared';

/** Weights by which each domain enters the final signal. Exposed in the UI. */
export const SYNTHESIS_WEIGHTS: Record<string, number> = {
  market: 0.26,
  fundamental: 0.26,
  news: 0.16,
  risk: 0.18,
  investor: 0.14,
};

export function computeConvergence(agents: AgentResult[]): number {
  if (agents.length < 2) return 100;
  const signals = agents.map((a) => a.signal);
  const mean = signals.reduce((a, b) => a + b, 0) / signals.length;
  const sd = Math.sqrt(
    signals.reduce((a, b) => a + (b - mean) ** 2, 0) / (signals.length - 1),
  );
  // 0 sd → full convergence; 25 sd → none.
  return Math.round(Math.max(0, 100 - (sd / 25) * 100));
}

export function detectDivergence(agents: AgentResult[]): Divergence {
  const sorted = agents.slice().sort((a, b) => a.signal - b.signal);
  const low = sorted[0];
  const high = sorted[sorted.length - 1];
  const spread = high.signal - low.signal;
  const detected = spread >= 25;
  return {
    detected,
    spread,
    between: detected ? [high.name, low.name] : null,
    explanation: detected
      ? `${high.name} reads ${high.signal} while ${low.name} reads ${low.signal}. The domains disagree by ${spread} points — the thesis rests on which domain resolves first.`
      : `All domains fall inside a ${spread}-point band. No material analytical disagreement.`,
  };
}

/** "What does the combined evidence indicate?" */
export const synthesisAgent: FinancialAgent = {
  id: 'synthesis',
  name: '2099 Synthesis',
  question: 'What does the combined evidence indicate?',
  async run(ctx: AgentContext): Promise<AgentResult> {
    const t0 = performance.now();
    const agents = ctx.upstream;
    const weighted = agents.reduce(
      (acc, a) => {
        const w = (SYNTHESIS_WEIGHTS[a.agentId] ?? 0) * (0.6 + a.confidence * 0.4);
        return { sum: acc.sum + a.signal * w, w: acc.w + w };
      },
      { sum: 0, w: 0 },
    );
    const signal = Math.round(weighted.w ? weighted.sum / weighted.w : 50);
    const divergence = detectDivergence(agents);
    const convergence = computeConvergence(agents);

    // Divergence never inflates confidence.
    const meanConfidence =
      agents.reduce((a, b) => a + b.confidence, 0) / Math.max(agents.length, 1);
    const confidence = Math.min(
      0.95,
      Math.max(0.35, meanConfidence * (0.65 + (convergence / 100) * 0.35)),
    );

    const evidence: Evidence[] = agents
      .flatMap((a) => a.evidence.map((e) => ({ e, agent: a })))
      .sort((x, y) => Math.abs(y.e.polarity * y.e.weight) - Math.abs(x.e.polarity * x.e.weight))
      .slice(0, 6)
      .map(({ e, agent }) => ({ ...e, id: `syn-${e.id}`, source: `${agent.name} · ${e.source}` }));

    const risks: RiskFactor[] = agents
      .flatMap((a) => a.risks)
      .filter((f, i, arr) => arr.findIndex((x) => x.id === f.id) === i)
      .sort((a, b) => b.severity - a.severity)
      .slice(0, 5);

    let stance = stanceFor(signal);
    if (divergence.detected && signal >= 45 && signal < 70) stance = 'watch';

    return {
      agentId: 'synthesis',
      name: synthesisAgent.name,
      question: synthesisAgent.question,
      stance,
      signal,
      confidence: Math.round(confidence * 100) / 100,
      evidence,
      risks,
      reasoning: [
        `Weighted across ${agents.length} domains, each scaled by its own confidence.`,
        `Signal convergence ${convergence}/100. ${divergence.explanation}`,
        `Position: ${STANCE_LABEL[stance]} at ${signal}/100 — a research signal, not a recommendation.`,
      ],
      origin: ctx.asset.origin,
      durationMs: Math.round(performance.now() - t0),
    };
  },
};

/** Conditions that would overturn the current conclusion. */
export function buildInvalidators(
  agents: AgentResult[],
  synthesis: AgentResult,
  quant: { metrics: { sma50: number; rsi14: number; annualVol: number } },
): string[] {
  const out: string[] = [];
  const bullish = synthesis.signal >= 55;
  out.push(
    bullish
      ? `A close below the 50-day mean (${quant.metrics.sma50}) would break the trend evidence the Market agent relies on.`
      : `A reclaim of the 50-day mean (${quant.metrics.sma50}) would invalidate the Market agent's negative read.`,
  );
  const fund = agents.find((a) => a.agentId === 'fundamental');
  if (fund) {
    out.push(
      `A quarter where earnings growth falls below revenue growth would remove the operating-leverage argument scoring ${fund.signal}/100.`,
    );
  }
  const newsAgentResult = agents.find((a) => a.agentId === 'news');
  if (newsAgentResult) {
    out.push(
      `Reversal of the dominant news item, or any regulatory action, would flip a ${newsAgentResult.signal}/100 sentiment read.`,
    );
  }
  out.push(
    `Annualised volatility rising materially above ${quant.metrics.annualVol}% would push the risk index into the next band and lower the personalised signal.`,
  );
  return out;
}
