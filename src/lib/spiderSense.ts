// ── Spider-Sense: the orchestration state machine.
// Owns phase transitions and the typed event stream. It knows nothing about
// animation — the Web renderer subscribes to the same state the UI does.

import { fundamentalAgent } from '../agents/fundamentalAgent';
import { investorAgent } from '../agents/investorAgent';
import { marketAgent } from '../agents/marketAgent';
import { newsAgent } from '../agents/newsAgent';
import { buildRiskReport, riskAgent } from '../agents/riskAgent';
import type { AgentContext } from '../agents/shared';
import {
  buildInvalidators,
  computeConvergence,
  detectDivergence,
  synthesisAgent,
} from '../agents/synthesisAgent';
import { marketData, news as newsProvider } from '../data/providers';
import { buildContext, QUESTION_TEMPLATES, retrieve } from '../rag/retriever';
import type { RAGContext } from '../rag/types';
import { buildQuantReport } from '../quant/scoring';
import type {
  AgentResult,
  AnalysisResult,
  InvestorProfile,
  OrchestratorEvent,
  Phase,
} from '../types';

export interface OrchestratorState {
  phase: Phase;
  events: OrchestratorEvent[];
  agents: AgentResult[];
  result: AnalysisResult | null;
  error: string | null;
  /** Set when a live source failed and the demo dataset took over. */
  fellBack: boolean;
  /** Retrieval context for the grounded agent, exposed so the graph and the
   *  citation UI read the same state the agent did. */
  rag: RAGContext | null;
}

export const INITIAL_STATE: OrchestratorState = {
  phase: 'idle',
  events: [],
  agents: [],
  result: null,
  error: null,
  fellBack: false,
  rag: null,
};

type Emit = (s: OrchestratorState) => void;

/** Visible pacing between stages so the Web can be read while it builds.
 *  Kept in one place — it is presentation, not analysis. */
const STAGE_DELAY = 620;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function runSpiderSense(
  ticker: string,
  profile: InvestorProfile,
  emit: Emit,
  opts: { paced?: boolean } = {},
): Promise<AnalysisResult | null> {
  const paced = opts.paced ?? true;
  let seq = 0;
  let state: OrchestratorState = { ...INITIAL_STATE, phase: 'initializing' };

  const push = (
    type: OrchestratorEvent['type'],
    message: string,
    level: OrchestratorEvent['level'] = 'info',
    agentId?: OrchestratorEvent['agentId'],
  ) => {
    state = {
      ...state,
      events: [
        ...state.events,
        { id: seq++, type, message, level, agentId, at: Date.now() },
      ],
    };
    emit(state);
  };

  const setPhase = (phase: Phase) => {
    state = { ...state, phase };
    emit(state);
  };

  try {
    emit(state);
    push('agent_started', `SPIDER-SENSE initialised for ${ticker.toUpperCase()}`, 'signal');

    const asset = await marketData.fetchAsset(ticker);
    if (asset.origin === 'demo') {
      state = { ...state, fellBack: true };
      push(
        'fallback',
        'Live source unavailable — continuing with the verified demo dataset.',
        'warn',
      );
    }

    const quant = buildQuantReport(asset);
    push(
      'evidence_added',
      `Quant Core: RSI ${quant.metrics.rsi14} · vol ${quant.metrics.annualVol}% · mom ${quant.metrics.momentum20}%`,
      'signal',
    );

    const newsItems = await newsProvider.fetchNews(asset);

    // ── RAG retrieval ────────────────────────────────────────────────────────
    // A natural-language question against the document corpus, filtered to this
    // issuer. Runs before the grounded agent so its result is part of the
    // agent's typed input rather than a side effect.
    push('retrieval_started', `RETRIEVAL dispatched for ${asset.name}`, 'info', 'fundamental');
    const question = QUESTION_TEMPLATES.fundamentals(asset.name);
    const retrievalResult = retrieve({
      query: question,
      filter: { ticker: asset.ticker },
      topK: 4,
    });
    const rag = buildContext(question, retrievalResult);
    state = { ...state, rag };
    if (retrievalResult.status === 'OK') {
      push(
        'retrieval_completed',
        `RETRIEVAL ${retrievalResult.chunks.length} chunk(s) from ${
          new Set(rag.citations.map((c) => c.documentId)).size
        } document(s) · top sim ${retrievalResult.chunks[0].similarity} · ${retrievalResult.latencyMs}ms`,
        'signal',
        'fundamental',
      );
    } else {
      push(
        'retrieval_completed',
        `RETRIEVAL ${retrievalResult.status} — grounded claims will be omitted, not invented.`,
        'warn',
        'fundamental',
      );
    }

    const ctx: AgentContext = { asset, quant, profile, news: newsItems, rag, upstream: [] };

    const runAgent = async (
      agent: typeof marketAgent,
      phase: Phase,
    ): Promise<AgentResult> => {
      setPhase(phase);
      push('agent_started', `${agent.name.toUpperCase()} started`, 'info', agent.id);
      if (paced) await wait(STAGE_DELAY);
      const res = await agent.run({ ...ctx, upstream: state.agents });
      state = { ...state, agents: [...state.agents, res] };
      for (const e of res.evidence.slice(0, 2)) {
        push('evidence_added', `${e.label}${e.value ? ` = ${e.value}` : ''}`, 'info', agent.id);
      }
      for (const r of res.risks) {
        push('risk_detected', `${r.label} (severity ${r.severity})`, 'warn', agent.id);
      }
      push(
        'agent_completed',
        `${agent.name.toUpperCase()} completed · signal ${res.signal}/100 · confidence ${(res.confidence * 100).toFixed(0)}%`,
        'signal',
        agent.id,
      );
      return res;
    };

    // Market, Fundamental and News read disjoint inputs — price series,
    // retrieved documents, and the news feed — so all three dispatch together.
    // Risk and Investor stay downstream because they legitimately consume the
    // upstream results; running them concurrently would be theatre.
    setPhase('market');
    push(
      'agent_started',
      'MARKET_AGENT, FUNDAMENTAL_AGENT and NEWS_AGENT dispatched in parallel',
      'info',
    );
    if (paced) await wait(STAGE_DELAY);
    const parallelStart = Date.now();
    const [market, fundamental, newsResult] = await Promise.all([
      marketAgent.run(ctx),
      fundamentalAgent.run(ctx),
      newsAgent.run(ctx),
    ]);
    state = { ...state, agents: [market, fundamental, newsResult] };
    for (const a of [market, fundamental, newsResult]) {
      for (const r of a.risks) {
        push('risk_detected', `${r.label} (severity ${r.severity})`, 'warn', a.agentId);
      }
      push(
        'agent_completed',
        `${a.name.toUpperCase()} completed · signal ${a.signal}/100 · confidence ${(a.confidence * 100).toFixed(0)}%`,
        'signal',
        a.agentId,
      );
    }
    push(
      'agent_completed',
      `3 agents completed concurrently in ${Date.now() - parallelStart}ms wall time`,
      'info',
    );
    setPhase('fundamental');
    setPhase('news');

    const risk = await runAgent(riskAgent, 'risk');
    await runAgent(investorAgent, 'investor');

    setPhase('synthesis');
    push('synthesis_started', '2099 SYNTHESIS started', 'signal', 'synthesis');
    if (paced) await wait(STAGE_DELAY);
    const synthesis = await synthesisAgent.run({ ...ctx, upstream: state.agents });

    const divergence = detectDivergence(state.agents);
    if (divergence.detected) {
      push(
        'divergence_detected',
        `ANALYTICAL DIVERGENCE · ${divergence.spread}-point spread`,
        'warn',
        'synthesis',
      );
    }
    push(
      'synthesis_completed',
      `2099 SYNTHESIS completed · ${synthesis.signal}/100`,
      'signal',
      'synthesis',
    );

    const investor = state.agents.find((a) => a.agentId === 'investor');
    const result: AnalysisResult = {
      asset,
      profile,
      quant,
      agents: state.agents,
      synthesis,
      risk: buildRiskReport(risk),
      convergence: computeConvergence(state.agents),
      divergence,
      marketSignal: Math.round(market.signal * 0.4 + fundamental.signal * 0.4 + newsResult.signal * 0.2),
      rag,
      personalSignal: investor?.signal ?? synthesis.signal,
      invalidators: buildInvalidators(state.agents, synthesis, quant),
      origin: asset.origin,
      completedAt: new Date().toISOString(),
    };

    state = { ...state, phase: 'complete', result };
    emit(state);
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Analysis failed.';
    state = { ...state, phase: 'error', error: message };
    emit(state);
    return null;
  }
}

export const PHASE_LABEL: Record<Phase, string> = {
  idle: 'Idle',
  initializing: 'Initialising',
  market: 'Market analysis',
  fundamental: 'Fundamental analysis',
  news: 'News retrieval',
  risk: 'Risk analysis',
  investor: 'Investor context',
  synthesis: '2099 synthesis',
  complete: 'Complete',
  error: 'Error',
};

export const PHASE_ORDER: Phase[] = [
  'initializing',
  'market',
  'fundamental',
  'news',
  'risk',
  'investor',
  'synthesis',
  'complete',
];
