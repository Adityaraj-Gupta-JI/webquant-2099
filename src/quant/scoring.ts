// ── Scoring layer. Consumes raw indicators, produces a transparent 0..100 score.
// This is NOT a probability of profit. It is a weighted, auditable signal score.

import type { Asset, QuantMetrics, QuantReport, QuantSignal } from '../types';
import {
  annualisedVolatility,
  relativeToAverage,
  zScoreOfLast,
  clamp,
  ema,
  lastOf,
  maxDrawdown,
  momentum,
  normalise,
  round,
  rsi,
  sma,
} from './indicators';

export const MIN_CANDLES = 60;

export class InsufficientDataError extends Error {
  constructor(n: number) {
    super(`Insufficient price history: ${n} bars, need ${MIN_CANDLES}.`);
    this.name = 'InsufficientDataError';
  }
}

export function computeMetrics(closes: number[], volumes: number[] = []): QuantMetrics {
  if (closes.length < MIN_CANDLES) throw new InsufficientDataError(closes.length);
  const s20 = lastOf(sma(closes, 20));
  const s50 = lastOf(sma(closes, 50));
  const last = closes[closes.length - 1];
  return {
    last: round(last),
    relativeVolume: round(relativeToAverage(volumes), 2),
    volumeZScore: round(zScoreOfLast(volumes), 2),
    sma20: round(s20),
    sma50: round(s50),
    ema12: round(lastOf(ema(closes, 12))),
    ema26: round(lastOf(ema(closes, 26))),
    rsi14: round(rsi(closes, 14), 1),
    momentum20: round(momentum(closes, 20), 2),
    annualVol: round(annualisedVolatility(closes), 1),
    maxDrawdown: round(maxDrawdown(closes), 1),
    aboveSma50: last > s50,
  };
}

/** Transparent weights — exposed in the UI so the score is auditable. */
export const SCORE_WEIGHTS = {
  trend: 0.25,
  momentum: 0.18,
  volume: 0.09,
  volatility: 0.13,
  valuation: 0.15,
  fundamental: 0.2,
} as const;

export function scoreQuant(m: QuantMetrics, a: Asset): QuantSignal {
  const f = a.fundamentals;

  // Trend: price vs 50-day, and 20-day vs 50-day slope proxy.
  const priceVsSma = ((m.last - m.sma50) / m.sma50) * 100;
  const smaSpread = ((m.sma20 - m.sma50) / m.sma50) * 100;
  const trendScore = clamp(
    normalise(priceVsSma, -8, 8) * 0.6 + normalise(smaSpread, -4, 4) * 0.4,
  );

  // Momentum: 20-bar return blended with RSI distance from neutral.
  const momentumScore = clamp(
    normalise(m.momentum20, -10, 10) * 0.65 + normalise(m.rsi14, 25, 75) * 0.35,
  );

  // Volume: participation confirming the price move scores higher; heavy volume
  // against the move scores lower. Volume alone is directionless, so it is read
  // as confirmation of momentum rather than as a signal in its own right.
  const rv = Number.isNaN(m.relativeVolume) ? 1 : m.relativeVolume;
  const participation = clamp(normalise(rv, 0.5, 2.0));
  const direction = Math.sign(m.momentum20 || 0);
  const volumeScore = clamp(50 + (participation - 50) * (direction >= 0 ? 1 : -1));

  // Volatility: lower realised vol scores higher (inverted).
  const volatilityScore = clamp(100 - normalise(m.annualVol, 12, 55));

  // Valuation: discount to sector P/E scores higher.
  const pePremium = ((f.peRatio - f.sectorPe) / f.sectorPe) * 100;
  const valuationScore = clamp(100 - normalise(pePremium, -30, 45));

  // Fundamental: growth + returns, penalised by leverage.
  const fundamentalScore = clamp(
    normalise(f.revenueGrowthYoY, -5, 25) * 0.3 +
      normalise(f.epsGrowthYoY, -10, 30) * 0.3 +
      normalise(f.roe, 5, 28) * 0.25 +
      (100 - normalise(f.debtToEquity, 0.1, 1.8)) * 0.15,
  );

  const overallScore =
    trendScore * SCORE_WEIGHTS.trend +
    momentumScore * SCORE_WEIGHTS.momentum +
    volumeScore * SCORE_WEIGHTS.volume +
    volatilityScore * SCORE_WEIGHTS.volatility +
    valuationScore * SCORE_WEIGHTS.valuation +
    fundamentalScore * SCORE_WEIGHTS.fundamental;

  return {
    trendScore: round(trendScore, 1),
    momentumScore: round(momentumScore, 1),
    volumeScore: round(volumeScore, 1),
    volatilityScore: round(volatilityScore, 1),
    valuationScore: round(valuationScore, 1),
    fundamentalScore: round(fundamentalScore, 1),
    overallScore: round(overallScore, 1),
  };
}

export function buildQuantReport(asset: Asset): QuantReport {
  const closes = asset.candles.map((c) => c.c);
  const volumes = asset.candles.map((c) => c.v);
  const metrics = computeMetrics(closes, volumes);
  const signal = scoreQuant(metrics, asset);
  const notes: string[] = [];

  notes.push(
    metrics.aboveSma50
      ? `Price ${metrics.last} trades above the 50-day mean (${metrics.sma50}).`
      : `Price ${metrics.last} trades below the 50-day mean (${metrics.sma50}).`,
  );
  if (metrics.rsi14 >= 70) notes.push(`RSI(14) at ${metrics.rsi14} — extended.`);
  else if (metrics.rsi14 <= 30) notes.push(`RSI(14) at ${metrics.rsi14} — washed out.`);
  else notes.push(`RSI(14) at ${metrics.rsi14} — inside the neutral band.`);
  notes.push(
    `Volume at ${metrics.relativeVolume}x its 20-day average (z=${metrics.volumeZScore}).`,
  );
  notes.push(`Annualised volatility ${metrics.annualVol}%, max drawdown ${metrics.maxDrawdown}%.`);

  return { metrics, signal, notes };
}
