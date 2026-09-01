import type {
  AgentId,
  AgentResult,
  Asset,
  Evidence,
  InvestorProfile,
  QuantReport,
  Stance,
} from '../types';

/** Everything an agent is allowed to see. Agents interpret these values —
 *  they never originate numbers of their own. */
export interface AgentContext {
  asset: Asset;
  /** Retrieved document context. Absent when retrieval was not run for this
   *  agent; present-but-empty when retrieval ran and found nothing. */
  rag?: import('../rag/types').RAGContext;
  quant: QuantReport;
  profile: InvestorProfile;
  news: Evidence[];
  /** Results of agents that have already run this cycle. */
  upstream: AgentResult[];
}

export interface FinancialAgent {
  id: AgentId;
  name: string;
  question: string;
  run(ctx: AgentContext): Promise<AgentResult>;
}

/** The JSON contract an LLM-backed agent must return. Enforced on parse so a
 *  malformed or hallucinated response can never reach the graph. */
export interface AgentJsonResponse {
  agentId: AgentId;
  stance: Stance;
  signal: number;
  confidence: number;
  evidence: Evidence[];
  risks: AgentResult['risks'];
  reasoning: string[];
}

export function stanceFor(signal: number): Stance {
  if (signal >= 74) return 'bullish';
  if (signal >= 60) return 'cautiously-bullish';
  if (signal >= 45) return 'neutral';
  if (signal >= 32) return 'cautiously-bearish';
  return 'bearish';
}

export const STANCE_LABEL: Record<Stance, string> = {
  bullish: 'Bullish',
  'cautiously-bullish': 'Cautiously Bullish',
  neutral: 'Neutral',
  'cautiously-bearish': 'Cautiously Bearish',
  bearish: 'Bearish',
  watch: 'Watch',
};

export const round1 = (n: number) => Math.round(n * 10) / 10;

export function metricEvidence(
  id: string,
  label: string,
  value: string,
  detail: string,
  polarity: number,
  weight: number,
  origin: Asset['origin'],
  timestamp: string,
): Evidence {
  return {
    id,
    kind: 'metric',
    label,
    value,
    detail,
    source: 'WEBQUANT Quant Core',
    timestamp,
    origin,
    polarity,
    weight,
  };
}

/** Confidence rises with the number of independent, agreeing signals. */
export function confidenceFrom(items: { polarity: number; weight: number }[]): number {
  if (!items.length) return 0.4;
  const total = items.reduce((a, b) => a + b.weight, 0);
  const net = items.reduce((a, b) => a + b.polarity * b.weight, 0);
  const agreement = total === 0 ? 0 : Math.abs(net) / total;
  const depth = Math.min(items.length / 5, 1);
  return round1((0.45 + agreement * 0.35 + depth * 0.2) * 100) / 100;
}
