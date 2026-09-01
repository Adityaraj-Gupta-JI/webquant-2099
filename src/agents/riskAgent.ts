import type { AgentResult, Evidence, RiskFactor, RiskReport } from '../types';
import { stanceFor, type AgentContext, type FinancialAgent } from './shared';

const BANDS: [number, RiskReport['band']][] = [
  [30, 'LOW'],
  [55, 'MODERATE'],
  [75, 'ELEVATED'],
  [101, 'HIGH'],
];

export function bandFor(index: number): RiskReport['band'] {
  return BANDS.find(([ceil]) => index < ceil)?.[1] ?? 'HIGH';
}

/** "What could go wrong?" Aggregates every upstream risk plus its own
 *  quantitative and portfolio-exposure checks into a single index. */
export const riskAgent: FinancialAgent = {
  id: 'risk',
  name: 'Risk Intelligence',
  question: 'What could invalidate this thesis?',
  async run(ctx: AgentContext): Promise<AgentResult> {
    const t0 = performance.now();
    const m = ctx.quant.metrics;
    const asOf = ctx.asset.candles[ctx.asset.candles.length - 1].t;

    const own: RiskFactor[] = [
      {
        id: 'rk-vol',
        category: 'volatility',
        label: 'Realised volatility',
        detail: `Annualised volatility of ${m.annualVol}% defines the size of a normal adverse move.`,
        severity: Math.min(100, Math.round(((m.annualVol - 10) / 45) * 100)),
      },
      {
        id: 'rk-dd',
        category: 'drawdown',
        label: 'Historical drawdown',
        detail: `The worst peak-to-trough decline in the window was ${m.maxDrawdown}%.`,
        severity: Math.min(100, Math.round((Math.abs(m.maxDrawdown) / 40) * 100)),
      },
    ];

    const exposure = ctx.profile.allocation[ctx.asset.sector] ?? 0;
    if (exposure > 25) {
      own.push({
        id: 'rk-conc',
        category: 'concentration',
        label: 'Sector concentration',
        detail: `The portfolio already holds ${exposure}% in ${ctx.asset.sector}; adding here compounds a single-sector shock.`,
        severity: Math.min(100, Math.round(exposure * 1.8)),
      });
    }

    const inherited = ctx.upstream.flatMap((a) => a.risks);
    const factors = [...own, ...inherited].filter(
      (f, i, arr) => arr.findIndex((x) => x.id === f.id) === i,
    );

    // Index = severity-weighted mean, tilted toward the worst factor.
    const mean = factors.reduce((a, f) => a + f.severity, 0) / Math.max(factors.length, 1);
    const worst = factors.reduce((a, f) => Math.max(a, f.severity), 0);
    const index = Math.round(Math.min(100, mean * 0.6 + worst * 0.4));

    const evidence: Evidence[] = factors.slice(0, 5).map((f) => ({
      id: `ev-${f.id}`,
      kind: 'metric',
      label: f.label,
      value: `${f.severity}/100`,
      detail: f.detail,
      source: 'WEBQUANT Risk Intelligence',
      timestamp: asOf,
      origin: ctx.asset.origin,
      polarity: -Math.min(1, f.severity / 100),
      weight: Math.min(1, f.severity / 100),
    }));

    // A high risk index depresses the risk agent's own signal.
    const signal = Math.round(Math.max(5, 100 - index * 0.85));
    return {
      agentId: 'risk',
      name: riskAgent.name,
      question: riskAgent.question,
      stance: stanceFor(signal),
      signal,
      confidence: 0.72 + Math.min(factors.length, 6) * 0.03,
      evidence,
      risks: factors,
      reasoning: [
        `Risk index ${index}/100 — ${bandFor(index)}.`,
        `${factors.length} factors across ${new Set(factors.map((f) => f.category)).size} categories.`,
        `Largest single contributor: ${
          factors.slice().sort((a, b) => b.severity - a.severity)[0]?.label ?? 'none'
        }.`,
      ],
      origin: ctx.asset.origin,
      durationMs: Math.round(performance.now() - t0),
    };
  },
};

export function buildRiskReport(result: AgentResult): RiskReport {
  const factors = result.risks;
  const byCategory = new Map<RiskFactor['category'], number>();
  for (const f of factors) {
    byCategory.set(f.category, Math.max(byCategory.get(f.category) ?? 0, f.severity));
  }
  const mean = factors.reduce((a, f) => a + f.severity, 0) / Math.max(factors.length, 1);
  const worst = factors.reduce((a, f) => Math.max(a, f.severity), 0);
  const index = Math.round(Math.min(100, mean * 0.6 + worst * 0.4));
  return {
    index,
    band: bandFor(index),
    contributors: [...byCategory.entries()]
      .map(([category, score]) => ({
        category,
        label: category.toUpperCase(),
        score,
      }))
      .sort((a, b) => b.score - a.score),
    factors,
  };
}
