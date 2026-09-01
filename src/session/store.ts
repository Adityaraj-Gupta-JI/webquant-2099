// ── Session persistence ──────────────────────────────────────────────────────
// localStorage only. No account, no server, no personal data — the profile,
// watchlist and a bounded history of past analyses, so a refresh does not erase
// the session and so profiles are genuinely *stored* rather than transient.

import type { AnalysisResult, InvestorProfile } from '../types';

const KEY = 'webquant2099:v1';
const MAX_HISTORY = 25;

export interface SessionMetrics {
  ticker: string;
  completedAt: string;
  /** Wall-clock time from dispatch to synthesis, excluding UI pacing. */
  totalLatencyMs: number;
  agentLatencyMs: Record<string, number>;
  retrievalLatencyMs: number;
  chunksRetrieved: number;
  citationCount: number;
  /** Share of the grounded agent's document claims that carry a citation. */
  citationCoverage: number;
  convergence: number;
  riskConcentration: number;
  signal: number;
  stance: string;
  dataSource: 'live' | 'demo';
  retrievalStatus: string;
}

export interface PersistedSession {
  profile: InvestorProfile;
  watchlist: string[];
  history: SessionMetrics[];
  /** Interaction counts — the behavioural half of the profile. */
  interactions: { ticker: string; count: number; lastSeen: string }[];
}

const EMPTY: PersistedSession = {
  profile: { riskTolerance: 'moderate', horizon: 'long', allocation: {} },
  watchlist: [],
  history: [],
  interactions: [],
};

/** Storage is best-effort: private mode, quota, and disabled storage all mean
 *  the app keeps working with in-memory state instead of throwing. */
function read(): PersistedSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedSession>;
    return { ...EMPTY, ...parsed };
  } catch {
    return null;
  }
}

function write(session: PersistedSession): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    /* storage unavailable — session stays in memory for this tab */
  }
}

export function loadSession(fallbackProfile: InvestorProfile): PersistedSession {
  return read() ?? { ...EMPTY, profile: fallbackProfile };
}

export function saveProfile(profile: InvestorProfile, current: PersistedSession): PersistedSession {
  const next = { ...current, profile };
  write(next);
  return next;
}

export function toggleWatchlist(ticker: string, current: PersistedSession): PersistedSession {
  const t = ticker.toUpperCase();
  const watchlist = current.watchlist.includes(t)
    ? current.watchlist.filter((x) => x !== t)
    : [...current.watchlist, t];
  const next = { ...current, watchlist };
  write(next);
  return next;
}

export function recordSession(
  metrics: SessionMetrics,
  current: PersistedSession,
): PersistedSession {
  const interactions = [...current.interactions];
  const existing = interactions.find((i) => i.ticker === metrics.ticker);
  if (existing) {
    existing.count += 1;
    existing.lastSeen = metrics.completedAt;
  } else {
    interactions.push({ ticker: metrics.ticker, count: 1, lastSeen: metrics.completedAt });
  }
  const next: PersistedSession = {
    ...current,
    history: [metrics, ...current.history].slice(0, MAX_HISTORY),
    interactions,
  };
  write(next);
  return next;
}

export function clearSession(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}

/** Herfindahl-style concentration of the portfolio, 0..100. A single-sector
 *  portfolio scores 100; an evenly spread one scores near zero. */
export function riskConcentration(allocation: Record<string, number>): number {
  const values = Object.values(allocation);
  const total = values.reduce((a, b) => a + b, 0);
  if (total <= 0) return 0;
  const hhi = values.reduce((a, v) => a + (v / total) ** 2, 0);
  const n = values.length || 1;
  const min = 1 / n;
  return Math.round(Math.max(0, (hhi - min) / (1 - min)) * 100);
}

export function metricsFrom(result: AnalysisResult, totalLatencyMs: number): SessionMetrics {
  const fundamental = result.agents.find((a) => a.agentId === 'fundamental');
  const documentClaims = fundamental?.evidence.filter((e) => e.kind === 'document') ?? [];
  const cited = documentClaims.filter((e) => e.citation).length;
  return {
    ticker: result.asset.ticker,
    completedAt: result.completedAt,
    totalLatencyMs,
    agentLatencyMs: Object.fromEntries(result.agents.map((a) => [a.agentId, a.durationMs])),
    retrievalLatencyMs: result.rag?.result.latencyMs ?? 0,
    chunksRetrieved: result.rag?.result.chunks.length ?? 0,
    citationCount: fundamental?.citations?.length ?? 0,
    citationCoverage: documentClaims.length ? Math.round((cited / documentClaims.length) * 100) : 100,
    convergence: result.convergence,
    riskConcentration: riskConcentration(result.profile.allocation),
    signal: result.synthesis.signal,
    stance: result.synthesis.stance,
    dataSource: result.origin,
    retrievalStatus: result.rag?.result.status ?? 'NOT_RUN',
  };
}
