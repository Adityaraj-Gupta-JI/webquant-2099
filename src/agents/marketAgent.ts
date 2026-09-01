import type { AgentResult, Evidence, RiskFactor } from '../types';
import {
  confidenceFrom,
  metricEvidence,
  stanceFor,
  type AgentContext,
  type FinancialAgent,
} from './shared';

/** "What does price and volume behaviour indicate?" */
export const marketAgent: FinancialAgent = {
  id: 'market',
  name: 'Market Intelligence',
  question: 'What does price and volume behaviour indicate?',
  async run(ctx: AgentContext): Promise<AgentResult> {
    const t0 = performance.now();
    const { metrics: m, signal: s } = ctx.quant;
    const asOf = ctx.asset.candles[ctx.asset.candles.length - 1].t;
    const evidence: Evidence[] = [
      metricEvidence(
        'ev-mkt-trend',
        'Price vs 50-day mean',
        `${m.last} / ${m.sma50}`,
        m.aboveSma50
          ? 'Trading above the 50-day mean — the intermediate trend is intact.'
          : 'Trading below the 50-day mean — the intermediate trend is broken.',
        m.aboveSma50 ? 0.7 : -0.7,
        0.8,
        ctx.asset.origin,
        asOf,
      ),
      metricEvidence(
        'ev-mkt-rsi',
        'RSI (14)',
        `${m.rsi14}`,
        m.rsi14 >= 70
          ? 'Momentum is extended; mean reversion risk is elevated.'
          : m.rsi14 <= 30
            ? 'Momentum is washed out; the move is stretched to the downside.'
            : 'Momentum sits inside the neutral band.',
        m.rsi14 >= 70 ? -0.3 : m.rsi14 <= 30 ? -0.2 : 0.25,
        0.55,
        ctx.asset.origin,
        asOf,
      ),
      metricEvidence(
        'ev-mkt-vol',
        'Relative volume (20d)',
        `${m.relativeVolume}x`,
        m.relativeVolume >= 1.5
          ? `Participation at ${m.relativeVolume}x the 20-day average — the move is being confirmed by volume.`
          : m.relativeVolume <= 0.7
            ? `Participation at only ${m.relativeVolume}x the 20-day average — the move lacks conviction.`
            : `Participation at ${m.relativeVolume}x the 20-day average — unremarkable.`,
        // Volume is directionless on its own; read as confirmation of momentum.
        Math.max(-1, Math.min(1, ((m.relativeVolume - 1) * Math.sign(m.momentum20 || 1)) / 0.8)),
        0.5,
        ctx.asset.origin,
        asOf,
      ),
      metricEvidence(
        'ev-mkt-mom',
        '20-day momentum',
        `${m.momentum20}%`,
        `Price has moved ${m.momentum20}% over the last 20 sessions.`,
        Math.max(-1, Math.min(1, m.momentum20 / 12)),
        0.7,
        ctx.asset.origin,
        asOf,
      ),
    ];

    const risks: RiskFactor[] = [];
    if (m.rsi14 >= 68) {
      risks.push({
        id: 'rk-mkt-extended',
        category: 'volatility',
        label: 'Extended short-term momentum',
        detail: `RSI(14) at ${m.rsi14} leaves little cushion if flows reverse.`,
        severity: Math.min(90, Math.round((m.rsi14 - 50) * 2)),
      });
    }
    if (!m.aboveSma50) {
      risks.push({
        id: 'rk-mkt-trend',
        category: 'drawdown',
        label: 'Broken intermediate trend',
        detail: 'Price is below the 50-day mean, which historically precedes weaker follow-through.',
        severity: 62,
      });
    }

    if (Math.abs(m.volumeZScore) >= 2) {
      risks.push({
        id: 'rk-mkt-volume',
        category: 'volatility',
        label: 'Volume anomaly',
        detail: `Latest volume is ${m.volumeZScore} standard deviations from its 20-day mean, which often precedes an expansion in price range.`,
        severity: Math.min(85, Math.round(Math.abs(m.volumeZScore) * 26)),
      });
    }

    const signal = Math.round(
      s.trendScore * 0.45 + s.momentumScore * 0.37 + s.volumeScore * 0.18,
    );
    return {
      agentId: 'market',
      name: marketAgent.name,
      question: marketAgent.question,
      stance: stanceFor(signal),
      signal,
      confidence: confidenceFrom(evidence),
      evidence,
      risks,
      reasoning: [
        `Trend score ${s.trendScore}/100 from price position relative to the 20- and 50-day means.`,
        `Momentum score ${s.momentumScore}/100 from the 20-session return blended with RSI.`,
        `Volume score ${s.volumeScore}/100 — ${m.relativeVolume}x the 20-day average, read as confirmation of the price move.`,
        ctx.quant.notes[0],
      ],
      origin: ctx.asset.origin,
      durationMs: Math.round(performance.now() - t0),
    };
  },
};
