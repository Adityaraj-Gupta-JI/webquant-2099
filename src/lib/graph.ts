// ── Graph model. Derived purely from analysis state — the renderer owns no
// business logic, and no node exists that the analysis did not produce.

import type {
  AgentResult,
  AnalysisResult,
  GraphEdge,
  GraphNode,
  WebGraph,
} from '../types';

export const VIEW_W = 1100;
export const VIEW_H = 900;
const CX = 560;
const CY = 432;
const AGENT_R = 208;
const LEAF_R = 376;
const DOC_R = 486;
const SYNTH = { x: 560, y: 814 };

/** Fixed angles (degrees, SVG y-down) keep the layout deterministic between
 *  runs — the same analysis always draws the same web. */
const AGENT_ANGLE: Record<string, number> = {
  investor: 168,
  fundamental: 219,
  market: 270,
  news: 321,
  risk: 372,
};

const polar = (deg: number, r: number) => ({
  x: CX + Math.cos((deg * Math.PI) / 180) * r,
  y: CY + Math.sin((deg * Math.PI) / 180) * r,
});

/** Quadratic control point bowed perpendicular to the segment — used for both
 *  the rendered path and the spider position, so they always agree. */
export function edgeControl(a: { x: number; y: number }, b: { x: number; y: number }) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const bow = Math.min(len * 0.14, 46);
  return { x: mx + (-dy / len) * bow, y: my + (dx / len) * bow };
}

export function edgePath(a: GraphNode, b: GraphNode): string {
  const c = edgeControl(a, b);
  return `M ${a.x} ${a.y} Q ${c.x} ${c.y} ${b.x} ${b.y}`;
}

/** Point at t ∈ [0,1] along the same quadratic the path renders. */
export function pointAt(a: GraphNode, b: GraphNode, t: number) {
  const c = edgeControl(a, b);
  const u = 1 - t;
  return {
    x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
    y: u * u * a.y + 2 * u * t * c.y + t * t * b.y,
  };
}

export function buildGraph(result: AnalysisResult): WebGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const { asset, agents, synthesis, quant } = result;

  nodes.push({
    id: 'asset',
    type: 'asset',
    label: asset.ticker,
    value: `${asset.currency}${quant.metrics.last}`,
    detail: `${asset.name} · ${asset.exchange} · ${asset.sector}`,
    x: CX,
    y: CY,
    r: 38,
    origin: asset.origin,
    timestamp: asset.candles[asset.candles.length - 1].t,
  });

  nodes.push({
    id: 'synthesis',
    type: 'synthesis',
    label: '2099',
    value: `${synthesis.signal}/100`,
    detail: synthesis.reasoning[2] ?? '',
    x: SYNTH.x,
    y: SYNTH.y,
    r: 34,
    agentId: 'synthesis',
    confidence: synthesis.confidence,
    contribution: (synthesis.signal - 50) / 50,
    timestamp: result.completedAt,
    origin: result.origin,
  });

  // Documents that contributed retrieved evidence get their own outer ring, so
  // the chain reads DOCUMENT -> CHUNK -> AGENT -> SYNTHESIS on the canvas.
  const documentNodes = new Map<string, string>();

  const addLeaves = (agent: AgentResult, angle: number) => {
    // Retrieved passages are the whole point of the grounded agent, so they are
    // shown ahead of the structured metrics when both are present.
    const docs = agent.evidence.filter((e) => e.kind === 'document');
    const rest = agent.evidence.filter((e) => e.kind !== 'document');
    const items = [...docs.slice(0, 3), ...rest].slice(0, 4);
    const spread = 13;
    items.forEach((e, i) => {
      const a = angle + (i - (items.length - 1) / 2) * spread;
      const p = polar(a, LEAF_R + (i % 2) * 26);
      const isRisk = agent.agentId === 'risk';
      const id = `n-${e.id}`;
      nodes.push({
        id,
        type: isRisk ? 'risk' : e.kind === 'metric' ? 'metric' : 'evidence',
        label: e.label,
        value: e.value,
        detail: e.detail,
        x: p.x,
        y: p.y,
        r: isRisk ? 11 : 8,
        agentId: agent.agentId,
        confidence: agent.confidence,
        contribution: e.polarity,
        timestamp: e.timestamp,
        origin: e.origin,
      });
      edges.push({
        id: `e-${id}`,
        from: id,
        to: `agent-${agent.agentId}`,
        weight: e.weight,
        confidence: agent.confidence,
        polarity: e.polarity,
        agentId: agent.agentId,
        label: e.label,
      });

      // A cited passage hangs off the document it was retrieved from.
      if (e.citation) {
        const c = e.citation;
        const docId = `doc-${c.documentId}`;
        if (!documentNodes.has(docId)) {
          const dp = polar(a, DOC_R);
          documentNodes.set(docId, docId);
          nodes.push({
            id: docId,
            type: 'document',
            label: c.title.replace(/ \(synthetic\)$/, ''),
            value: c.documentType.replace(/_/g, ' '),
            detail: `${c.source} · published ${c.publishedAt}`,
            x: dp.x,
            y: dp.y,
            r: 13,
            agentId: agent.agentId,
            confidence: Math.max(0.3, c.relevance),
            timestamp: c.publishedAt,
            origin: 'demo',
          });
        }
        edges.push({
          id: `e-${docId}-${id}`,
          from: docId,
          to: id,
          weight: 0.5 + c.relevance,
          confidence: Math.max(0.35, c.relevance),
          polarity: 0.15,
          agentId: agent.agentId,
          label: `retrieved p.${c.page}`,
        });
      }
    });
  };

  for (const agent of agents) {
    const angle = AGENT_ANGLE[agent.agentId] ?? 270;
    const p = polar(angle, AGENT_R);
    const id = `agent-${agent.agentId}`;
    nodes.push({
      id,
      type: 'agent',
      label: agent.name,
      value: `${agent.signal}/100`,
      detail: agent.question,
      x: p.x,
      y: p.y,
      r: 24,
      agentId: agent.agentId,
      confidence: agent.confidence,
      contribution: (agent.signal - 50) / 50,
      timestamp: result.completedAt,
      origin: agent.origin,
    });
    edges.push({
      id: `e-asset-${agent.agentId}`,
      from: 'asset',
      to: id,
      weight: 0.75,
      confidence: agent.confidence,
      polarity: 0.2,
      agentId: agent.agentId,
      label: 'asset data',
    });
    edges.push({
      id: `e-${agent.agentId}-syn`,
      from: id,
      to: 'synthesis',
      weight: 0.4 + Math.abs(agent.signal - 50) / 100,
      confidence: agent.confidence,
      polarity: (agent.signal - 50) / 50,
      agentId: agent.agentId,
      label: `${agent.name} → synthesis`,
    });
    addLeaves(agent, angle);
  }

  return { nodes, edges };
}

export function neighbours(graph: WebGraph, nodeId: string): Set<string> {
  const set = new Set<string>([nodeId]);
  for (const e of graph.edges) {
    if (e.from === nodeId) set.add(e.to);
    if (e.to === nodeId) set.add(e.from);
  }
  return set;
}

/** One evidence → agent → synthesis chain, for "Follow the Web". */
export interface TrailStep {
  nodeId: string;
  title: string;
  body: string;
}

export function buildTrails(result: AnalysisResult, graph: WebGraph): TrailStep[][] {
  const trails: TrailStep[][] = [];
  for (const agent of result.agents) {
    // Prefer a cited passage when the agent has one — that trail shows the full
    // document -> chunk -> agent -> synthesis chain rather than a metric alone.
    const byStrength = agent.evidence
      .slice()
      .sort((a, b) => Math.abs(b.polarity * b.weight) - Math.abs(a.polarity * a.weight));
    const strongest = byStrength.find((e) => e.citation) ?? byStrength[0];
    if (!strongest) continue;
    const leafId = `n-${strongest.id}`;
    if (!graph.nodes.some((n) => n.id === leafId)) continue;
    const dir = strongest.polarity >= 0 ? 'supports' : 'contradicts';
    const steps: TrailStep[] = [];
    if (strongest.citation) {
      const c = strongest.citation;
      steps.push({
        nodeId: `doc-${c.documentId}`,
        title: `Document · ${c.title.replace(/ \(synthetic\)$/, '')}`,
        body: `${c.documentType.replace(/_/g, ' ')} published ${c.publishedAt}, ${c.source}. Retrieved by semantic query, section "${c.section}", page ${c.page}, cosine relevance ${c.relevance.toFixed(3)} (cosine ${c.similarity.toFixed(3)}).`,
      });
    }
    trails.push([
      ...steps,
      {
        nodeId: leafId,
        title: `Evidence · ${strongest.label}`,
        body: `${strongest.value ? `${strongest.value} — ` : ''}${strongest.detail} Source: ${strongest.source}, ${strongest.timestamp}.`,
      },
      {
        nodeId: `agent-${agent.agentId}`,
        title: `Agent · ${agent.name}`,
        body: `${agent.question} This evidence ${dir} the read at weight ${strongest.weight.toFixed(2)}, contributing to a ${agent.signal}/100 signal at ${(agent.confidence * 100).toFixed(0)}% confidence.`,
      },
      {
        nodeId: 'synthesis',
        title: 'Synthesis · 2099',
        body: `${agent.name} enters the final signal weighted by its confidence, producing ${result.synthesis.signal}/100 with ${result.convergence}/100 convergence.`,
      },
    ]);
  }
  return trails;
}
