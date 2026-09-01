import type { Asset, Candle, Evidence, Fundamentals } from '../types';
import { hashSeed, mulberry32 } from './seed';

/** Fixed reference date so the demo dataset never shifts under the judges. */
export const DEMO_ASOF = '2025-11-14';

interface Spec {
  ticker: string;
  name: string;
  sector: string;
  start: number;
  drift: number; // per-bar drift
  vol: number; // per-bar sigma
  fundamentals: Fundamentals;
}

const SPECS: Spec[] = [
  {
    ticker: 'RELIANCE',
    name: 'Reliance Industries Ltd.',
    sector: 'Energy',
    start: 1180,
    drift: 0.0015,
    vol: 0.0110,
    fundamentals: {
      revenueGrowthYoY: 8.4,
      epsGrowthYoY: 11.2,
      peRatio: 24.6,
      sectorPe: 21.0,
      roe: 9.1,
      debtToEquity: 0.42,
      operatingMargin: 16.3,
    },
  },
  {
    ticker: 'TCS',
    name: 'Tata Consultancy Services Ltd.',
    sector: 'IT',
    start: 3120,
    drift: -0.0011,
    vol: 0.0132,
    fundamentals: {
      revenueGrowthYoY: 4.1,
      epsGrowthYoY: 5.6,
      peRatio: 26.2,
      sectorPe: 25.4,
      roe: 46.8,
      debtToEquity: 0.09,
      operatingMargin: 24.1,
    },
  },
  {
    ticker: 'INFY',
    name: 'Infosys Ltd.',
    sector: 'IT',
    start: 1490,
    drift: 0.0015,
    vol: 0.0116,
    fundamentals: {
      revenueGrowthYoY: 6.9,
      epsGrowthYoY: 9.8,
      peRatio: 23.1,
      sectorPe: 25.4,
      roe: 31.2,
      debtToEquity: 0.11,
      operatingMargin: 21.0,
    },
  },
  {
    ticker: 'HDFCBANK',
    name: 'HDFC Bank Ltd.',
    sector: 'Banking',
    start: 1640,
    drift: 0.0004,
    vol: 0.0090,
    fundamentals: {
      revenueGrowthYoY: 12.7,
      epsGrowthYoY: 14.1,
      peRatio: 18.4,
      sectorPe: 19.8,
      roe: 16.9,
      debtToEquity: 1.14,
      operatingMargin: 28.6,
    },
  },
];

function buildCandles(spec: Spec, bars = 180): Candle[] {
  const rnd = mulberry32(hashSeed(spec.ticker));
  const out: Candle[] = [];
  let price = spec.start;
  const end = new Date(`${DEMO_ASOF}T00:00:00Z`).getTime();
  for (let i = bars - 1; i >= 0; i--) {
    // Box–Muller from the seeded uniform stream.
    const u1 = Math.max(rnd(), 1e-9);
    const u2 = rnd();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const ret = spec.drift + spec.vol * z;
    price = Math.max(price * (1 + ret), 1);
    const o = price * (1 - spec.vol * 0.25 * (rnd() - 0.5));
    const h = Math.max(o, price) * (1 + spec.vol * 0.4 * rnd());
    const l = Math.min(o, price) * (1 - spec.vol * 0.4 * rnd());
    out.push({
      t: new Date(end - i * 86400000).toISOString().slice(0, 10),
      o: +o.toFixed(2),
      h: +h.toFixed(2),
      l: +l.toFixed(2),
      c: +price.toFixed(2),
      v: Math.round(2_000_000 + rnd() * 6_000_000),
    });
  }
  return out;
}

export const DEMO_ASSETS: Asset[] = SPECS.map((s) => ({
  ticker: s.ticker,
  name: s.name,
  exchange: 'NSE',
  sector: s.sector,
  currency: '₹',
  candles: buildCandles(s),
  fundamentals: s.fundamentals,
  origin: 'demo' as const,
}));

export const DEMO_TICKERS = DEMO_ASSETS.map((a) => a.ticker);

/** Curated, non-reproduced news facts. Headline + extracted fact only. */
export const DEMO_NEWS: Record<string, Evidence[]> = {
  RELIANCE: [
    {
      id: 'nw-ril-1',
      kind: 'news',
      label: 'Retail arm posts double-digit quarterly growth',
      detail: 'Retail segment revenue growth reported in the low-teens year on year, ahead of the prior quarter.',
      source: 'Demo newswire',
      timestamp: '2025-11-11T09:15:00Z',
      origin: 'demo',
      polarity: 0.6,
      weight: 0.7,
    },
    {
      id: 'nw-ril-2',
      kind: 'news',
      label: 'Refining margin guidance trimmed',
      detail: 'Management flagged softer refining spreads into the next quarter on weaker product cracks.',
      source: 'Demo newswire',
      timestamp: '2025-11-08T05:40:00Z',
      origin: 'demo',
      polarity: -0.72,
      weight: 0.78,
    },
    {
      id: 'nw-ril-3',
      kind: 'news',
      label: 'Capex cycle for new energy extends',
      detail: 'Additional capital commitment disclosed for the new-energy build-out, pushing free cash flow recovery out.',
      source: 'Demo filings feed',
      timestamp: '2025-11-04T12:00:00Z',
      origin: 'demo',
      polarity: -0.5,
      weight: 0.6,
    },
  ],
  TCS: [
    {
      id: 'nw-tcs-1',
      kind: 'news',
      label: 'Deal total contract value holds steady',
      detail: 'Order book announced broadly flat sequentially; management reiterated the existing demand commentary.',
      source: 'Demo newswire',
      timestamp: '2025-11-10T06:30:00Z',
      origin: 'demo',
      polarity: 0.15,
      weight: 0.5,
    },
    {
      id: 'nw-tcs-2',
      kind: 'news',
      label: 'Discretionary IT spend still deferred',
      detail: 'Sector commentary points to continued deferral of discretionary programmes in BFSI clients.',
      source: 'Demo sector brief',
      timestamp: '2025-11-06T11:20:00Z',
      origin: 'demo',
      polarity: -0.5,
      weight: 0.6,
    },
  ],
  INFY: [
    {
      id: 'nw-infy-1',
      kind: 'news',
      label: 'FY guidance revised upward',
      detail: 'Full-year revenue growth guidance raised at the lower bound following a stronger quarter.',
      source: 'Demo newswire',
      timestamp: '2025-11-12T04:10:00Z',
      origin: 'demo',
      polarity: 0.75,
      weight: 0.8,
    },
    {
      id: 'nw-infy-2',
      kind: 'news',
      label: 'Large multi-year cloud mandate won',
      detail: 'A multi-year cloud modernisation mandate announced with a European client; value undisclosed.',
      source: 'Demo newswire',
      timestamp: '2025-11-09T08:00:00Z',
      origin: 'demo',
      polarity: 0.5,
      weight: 0.55,
    },
    {
      id: 'nw-infy-3',
      kind: 'news',
      label: 'Attrition ticks up',
      detail: 'Voluntary attrition rose modestly quarter on quarter, a mild margin headwind.',
      source: 'Demo filings feed',
      timestamp: '2025-11-03T10:45:00Z',
      origin: 'demo',
      polarity: -0.35,
      weight: 0.4,
    },
  ],
  HDFCBANK: [
    {
      id: 'nw-hdfc-1',
      kind: 'news',
      label: 'Deposit growth outpaces credit growth',
      detail: 'Deposit accretion reported ahead of loan growth, easing the funding-cost concern raised earlier.',
      source: 'Demo newswire',
      timestamp: '2025-11-13T07:00:00Z',
      origin: 'demo',
      polarity: 0.65,
      weight: 0.75,
    },
    {
      id: 'nw-hdfc-2',
      kind: 'news',
      label: 'Net interest margin compression flagged',
      detail: 'Management guided to continued margin pressure until the deposit repricing cycle completes.',
      source: 'Demo newswire',
      timestamp: '2025-11-07T09:30:00Z',
      origin: 'demo',
      polarity: -0.45,
      weight: 0.6,
    },
  ],
};
