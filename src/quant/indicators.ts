// ── Deterministic technical indicators. Pure functions, no randomness, no AI. ─

export function sma(values: number[], period: number): number[] {
  if (period <= 0) return [];
  const out: number[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    out.push(i >= period - 1 ? sum / period : NaN);
  }
  return out;
}

export function ema(values: number[], period: number): number[] {
  if (period <= 0 || values.length === 0) return [];
  const k = 2 / (period + 1);
  const out: number[] = [];
  let prev = values[0];
  for (let i = 0; i < values.length; i++) {
    prev = i === 0 ? values[0] : values[i] * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

/** Wilder-smoothed RSI. Returns the final value, or NaN if insufficient data. */
export function rsi(values: number[], period = 14): number {
  if (values.length < period + 1) return NaN;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = values[i] - values[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  for (let i = period + 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/** Percent change over `period` bars. */
export function momentum(values: number[], period = 20): number {
  if (values.length < period + 1) return NaN;
  const a = values[values.length - 1 - period];
  const b = values[values.length - 1];
  if (a === 0) return NaN;
  return ((b - a) / a) * 100;
}

export function dailyReturns(values: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < values.length; i++) {
    const prev = values[i - 1];
    if (prev === 0) continue;
    out.push((values[i] - prev) / prev);
  }
  return out;
}

export function stdev(values: number[]): number {
  if (values.length < 2) return NaN;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((a, b) => a + (b - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/** Annualised volatility in percent (252 trading days). */
export function annualisedVolatility(values: number[]): number {
  const r = dailyReturns(values);
  const sd = stdev(r);
  return Number.isNaN(sd) ? NaN : sd * Math.sqrt(252) * 100;
}

/** Maximum peak-to-trough decline, as a negative percent. */
export function maxDrawdown(values: number[]): number {
  if (values.length === 0) return NaN;
  let peak = values[0];
  let worst = 0;
  for (const v of values) {
    if (v > peak) peak = v;
    const dd = (v - peak) / peak;
    if (dd < worst) worst = dd;
  }
  return worst * 100;
}

/** Latest value as a multiple of the trailing mean, excluding itself. */
export function relativeToAverage(values: number[], period = 20): number {
  if (values.length < period + 1) return NaN;
  const window = values.slice(-period - 1, -1);
  const mean = window.reduce((a, b) => a + b, 0) / window.length;
  return mean === 0 ? NaN : values[values.length - 1] / mean;
}

/** How many standard deviations the latest value sits from its trailing mean. */
export function zScoreOfLast(values: number[], period = 20): number {
  if (values.length < period + 1) return NaN;
  const window = values.slice(-period - 1, -1);
  const mean = window.reduce((a, b) => a + b, 0) / window.length;
  const sd = stdev(window);
  if (!sd || Number.isNaN(sd)) return NaN;
  return (values[values.length - 1] - mean) / sd;
}

export const lastOf = (a: number[]): number =>
  a.length ? a[a.length - 1] : NaN;

/** Clamp to [min,max]. */
export const clamp = (v: number, min = 0, max = 100): number =>
  Math.min(max, Math.max(min, v));

/** Map a value from one range onto 0..100, clamped. */
export function normalise(v: number, lo: number, hi: number): number {
  if (Number.isNaN(v) || hi === lo) return 50;
  return clamp(((v - lo) / (hi - lo)) * 100);
}

export const round = (v: number, dp = 2): number =>
  Number.isNaN(v) ? NaN : Math.round(v * 10 ** dp) / 10 ** dp;
