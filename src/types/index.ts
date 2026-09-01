// ── Core domain types for WEBQUANT 2099 ───────────────────────────────────────

export type DataOrigin = 'live' | 'demo';

export interface Candle {
  t: string; // ISO date
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export interface Fundamentals {
  revenueGrowthYoY: number; // %
  epsGrowthYoY: number; // %
  peRatio: number;
  sectorPe: number;
  roe: number; // %
  debtToEquity: number;
  operatingMargin: number; // %
}

export interface Asset {
  ticker: string;
  name: string;
  exchange: string;
  sector: string;
  currency: string;
  candles: Candle[];
  fundamentals: Fundamentals;
  origin: DataOrigin;
}

export type RiskTolerance = 'conservative' | 'moderate' | 'aggressive';
export type Horizon = 'short' | 'medium' | 'long';

export interface InvestorProfile {
  riskTolerance: RiskTolerance;
  horizon: Horizon;
  /** sector -> % of portfolio */
  allocation: Record<string, number>;
}

export type EvidenceKind = 'metric' | 'news' | 'fundamental' | 'context' | 'document';

export interface Evidence {
  id: string;
  /** Present only on evidence retrieved from the document corpus. Never
   *  synthesised — it always points at a chunk that exists in the store. */
  citation?: import('../rag/types').Citation;
  kind: EvidenceKind;
  label: string;
  detail: string;
  value?: string;
  source: string;
  timestamp: string;
  origin: DataOrigin;
  /** -1 (contradicts thesis) .. +1 (supports thesis) */
  polarity: number;
  weight: number; // 0..1 influence
}

export interface RiskFactor {
  id: string;
  category: RiskCategory;
  label: string;
  detail: string;
  severity: number; // 0..100
}

export type RiskCategory =
  | 'volatility'
  | 'drawdown'
  | 'valuation'
  | 'concentration'
  | 'event'
  | 'exposure';

export type Stance =
  | 'bullish'
  | 'cautiously-bullish'
  | 'neutral'
  | 'cautiously-bearish'
  | 'bearish'
  | 'watch';

export type AgentId =
  | 'market'
  | 'fundamental'
  | 'news'
  | 'risk'
  | 'investor'
  | 'synthesis';

export interface AgentResult {
  agentId: AgentId;
  name: string;
  question: string;
  stance: Stance;
  signal: number; // 0..100
  confidence: number; // 0..1
  evidence: Evidence[];
  risks: RiskFactor[];
  reasoning: string[];
  origin: DataOrigin;
  durationMs: number;
  /** Populated by retrieval-grounded agents. Empty array = nothing retrieved,
   *  which is a valid and honest outcome. */
  citations?: import('../rag/types').Citation[];
  retrieval?: import('../rag/types').RetrievalMetadata;
}

export interface QuantSignal {
  trendScore: number;
  momentumScore: number;
  volumeScore: number;
  volatilityScore: number;
  valuationScore: number;
  fundamentalScore: number;
  overallScore: number;
}

export interface QuantMetrics {
  last: number;
  /** Latest volume as a multiple of its own 20-day average. >1 = unusual
   *  participation, which qualifies or contradicts a price move. */
  relativeVolume: number;
  volumeZScore: number;
  sma20: number;
  sma50: number;
  ema12: number;
  ema26: number;
  rsi14: number;
  momentum20: number; // %
  annualVol: number; // %
  maxDrawdown: number; // %
  aboveSma50: boolean;
}

export interface QuantReport {
  metrics: QuantMetrics;
  signal: QuantSignal;
  notes: string[];
}

export interface RiskReport {
  index: number; // 0..100
  band: 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH';
  contributors: { category: RiskCategory; label: string; score: number }[];
  factors: RiskFactor[];
}

export interface Divergence {
  detected: boolean;
  spread: number;
  between: [string, string] | null;
  explanation: string;
}

export interface AnalysisResult {
  asset: Asset;
  profile: InvestorProfile;
  quant: QuantReport;
  agents: AgentResult[];
  synthesis: AgentResult;
  risk: RiskReport;
  convergence: number; // 0..100
  divergence: Divergence;
  marketSignal: number;
  personalSignal: number;
  invalidators: string[];
  rag: import('../rag/types').RAGContext | null;
  origin: DataOrigin;
  completedAt: string;
}

// ── Orchestration ────────────────────────────────────────────────────────────

export type Phase =
  | 'idle'
  | 'initializing'
  | 'market'
  | 'fundamental'
  | 'news'
  | 'risk'
  | 'investor'
  | 'synthesis'
  | 'complete'
  | 'error';

export type EventType =
  | 'retrieval_started'
  | 'retrieval_completed'
  | 'agent_started'
  | 'agent_completed'
  | 'evidence_added'
  | 'risk_detected'
  | 'divergence_detected'
  | 'synthesis_started'
  | 'synthesis_completed'
  | 'fallback';

export interface OrchestratorEvent {
  id: number;
  type: EventType;
  agentId?: AgentId;
  message: string;
  at: number; // epoch ms
  level: 'info' | 'signal' | 'warn';
}

// ── Graph ────────────────────────────────────────────────────────────────────

export type NodeType =
  | 'asset'
  | 'agent'
  | 'metric'
  | 'evidence'
  | 'risk'
  | 'synthesis'
  | 'document';

export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  value?: string;
  x: number;
  y: number;
  r: number;
  agentId?: AgentId;
  confidence?: number;
  contribution?: number; // -1..1
  timestamp?: string;
  detail?: string;
  origin?: DataOrigin;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  weight: number; // 0..1 thickness
  confidence: number; // 0..1 opacity
  polarity: number; // -1..1, negative renders as opposing
  agentId?: AgentId;
  label?: string;
}

export interface WebGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
