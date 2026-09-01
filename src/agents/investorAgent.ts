import type { AgentResult, Evidence, RiskFactor } from '../types';
import { HORIZON_LABELS, RISK_LABELS } from '../data/profiles';
import { stanceFor, type AgentContext, type FinancialAgent } from './shared';

const TOLERANCE_VOL_CEILING = { conservative: 22, moderate: 34, aggressive: 55 };
const HORIZON_TREND_WEIGHT = { short: 0.7, medium: 0.45, long: 0.2 };

/** "How does this interact with the user's own context?"
 *  This is what makes the same asset score differently for two investors. */
export const investorAgent: FinancialAgent = {
  id: 'investor',
  name: 'Investor Context',
  question: "How does this interact with the user's portfolio and horizon?",
  async run(ctx: AgentContext): Promise<AgentResult> {
    const t0 = performance.now();
    const { profile, quant, asset } = ctx;
    const m = quant.metrics;
    const asOf = asset.candles[asset.candles.length - 1].t;
    const exposure = profile.allocation[asset.sector] ?? 0;
    const volCeiling = TOLERANCE_VOL_CEILING[profile.riskTolerance];
    const volFit = Math.max(-1, Math.min(1, (volCeiling - m.annualVol) / volCeiling));
    const trendW = HORIZON_TREND_WEIGHT[profile.horizon];

    // The market view, re-weighted for this investor.
    const marketView =
      quant.signal.trendScore * trendW +
      quant.signal.fundamentalScore * (1 - trendW) * 0.6 +
      quant.signal.valuationScore * (1 - trendW) * 0.4;

    const concentrationPenalty = exposure > 25 ? (exposure - 25) * 0.9 : 0;
    const volPenalty = volFit < 0 ? Math.abs(volFit) * 28 : 0;
    const signal = Math.round(Math.max(5, marketView - concentrationPenalty - volPenalty));

    const evidence: Evidence[] = [
      {
        id: 'ev-inv-conc',
        kind: 'context',
        label: `${asset.sector} exposure`,
        value: `${exposure}%`,
        detail:
          exposure > 25
            ? `The portfolio is already ${exposure}% in ${asset.sector}. Adding here concentrates a single-sector shock.`
            : `${asset.sector} exposure of ${exposure}% leaves room for this position.`,
        source: 'Investor profile',
        timestamp: asOf,
        origin: 'demo',
        polarity: exposure > 25 ? -0.7 : 0.3,
        weight: 0.75,
      },
      {
        id: 'ev-inv-vol',
        kind: 'context',
        label: 'Volatility vs tolerance',
        value: `${m.annualVol}% vs ${volCeiling}% ceiling`,
        detail:
          volFit < 0
            ? `Realised volatility exceeds the ${RISK_LABELS[profile.riskTolerance].toLowerCase()} ceiling.`
            : `Realised volatility sits inside the ${RISK_LABELS[profile.riskTolerance].toLowerCase()} ceiling.`,
        source: 'Investor profile',
        timestamp: asOf,
        origin: 'demo',
        polarity: volFit,
        weight: 0.7,
      },
      {
        id: 'ev-inv-hz',
        kind: 'context',
        label: 'Horizon weighting',
        value: HORIZON_LABELS[profile.horizon],
        detail: `A ${profile.horizon} horizon weights trend at ${Math.round(
          trendW * 100,
        )}% and fundamentals at ${Math.round((1 - trendW) * 100)}%.`,
        source: 'Investor profile',
        timestamp: asOf,
        origin: 'demo',
        polarity: 0.1,
        weight: 0.5,
      },
    ];

    const risks: RiskFactor[] = [];
    if (exposure > 25) {
      risks.push({
        id: 'rk-inv-conc',
        category: 'concentration',
        label: `Overweight ${asset.sector}`,
        detail: `${exposure}% of the portfolio already sits in this sector.`,
        severity: Math.min(100, Math.round(exposure * 1.7)),
      });
    }
    if (volFit < 0) {
      risks.push({
        id: 'rk-inv-vol',
        category: 'exposure',
        label: 'Volatility above stated tolerance',
        detail: `${m.annualVol}% annualised against a ${volCeiling}% ceiling for this profile.`,
        severity: Math.min(100, Math.round(Math.abs(volFit) * 100)),
      });
    }

    return {
      agentId: 'investor',
      name: investorAgent.name,
      question: investorAgent.question,
      stance: stanceFor(signal),
      signal,
      confidence: 0.78,
      evidence,
      risks,
      reasoning: [
        `Profile: ${RISK_LABELS[profile.riskTolerance]} · ${HORIZON_LABELS[profile.horizon]}.`,
        concentrationPenalty > 0
          ? `Concentration deducts ${Math.round(concentrationPenalty)} points from the market view.`
          : 'No concentration deduction applied.',
        volPenalty > 0
          ? `Volatility above tolerance deducts ${Math.round(volPenalty)} points.`
          : 'Volatility is within tolerance; no deduction.',
      ],
      origin: 'demo',
      durationMs: Math.round(performance.now() - t0),
    };
  },
};
